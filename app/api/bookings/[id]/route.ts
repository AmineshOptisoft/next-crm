import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { Service } from "@/app/models/Service";
import { log } from "console";

// ─── Helper ───────────────────────────────────────────────────────────────────
// Fields that should be SYNCED to every co-technician document that shares
// the same booking slot (recurringGroupId + startDateTime).
// We deliberately exclude `technicianId` / `technicianIds` so each tech
// document keeps its own assignment.
const SHARED_FIELDS = [
    "status",
    "serviceId",
    "subServices",
    "addons",
    "startDateTime",
    "endDateTime",
    "notes",
    "promoCode",
    "promocode",
    "shippingAddress",
    "pricing",
] as const;

// Fields that are only personal to this specific booking document
// (e.g. reassigning one tech while keeping others)
const PERSONAL_FIELDS = ["technicianId", "technicianIds", "timesheet"] as const;

async function calculateGeneralTimeMinutes(booking: any): Promise<number> {
    const serviceIds = new Set<string>();

    if (booking?.serviceId) {
        serviceIds.add(String(booking.serviceId));
    }

    for (const item of booking?.subServices || []) {
        if (item?.serviceId) serviceIds.add(String(item.serviceId));
    }

    for (const item of booking?.addons || []) {
        if (item?.serviceId) serviceIds.add(String(item.serviceId));
    }

    if (serviceIds.size === 0) return 0;

    const services = await Service.find(
        { _id: { $in: Array.from(serviceIds) } },
        { estimatedTime: 1 }
    ).lean();

    const estimatedTimeById = new Map<string, number>();
    for (const svc of services as any[]) {
        estimatedTimeById.set(String(svc._id), Number(svc.estimatedTime) || 0);
    }

    let total = 0;

    // Main service is treated as 1 unit.
    if (booking?.serviceId) {
        total += estimatedTimeById.get(String(booking.serviceId)) || 0;
    }

    // Sub-services and addons use selected quantity as units.
    for (const item of booking?.subServices || []) {
        const perUnit = estimatedTimeById.get(String(item?.serviceId)) || 0;
        const qty = Math.max(0, Number(item?.quantity) || 0);
        total += perUnit * qty;
    }

    for (const item of booking?.addons || []) {
        const perUnit = estimatedTimeById.get(String(item?.serviceId)) || 0;
        const qty = Math.max(0, Number(item?.quantity) || 0);
        total += perUnit * qty;
    }

    return total;
}

// ─── GET — Fetch single booking ───────────────────────────────────────────────
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || (!user.companyId && user.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        const booking = await Booking.findOne({ _id: id, companyId: user.companyId })
            .populate("contactId")
            .populate("serviceId")
            .populate("technicianId")
            .populate("subServices.serviceId")
            .populate("addons.serviceId")
            .lean();

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error("Error fetching booking:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking" },
            { status: 500 }
        );
    }
}

// ─── PATCH — Update booking + sync co-tech documents ─────────────────────────
// Problem solved:
//   ✅ Status Sync   — status change reflects on ALL techs for same slot
//   ✅ Edit Sync     — service/subservices/addons/notes/address/pricing/time
//                      updated across ALL tech documents for same slot
//   ✅ Pricing Sync  — single edit from UI auto-syncs to co-tech docs
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { id } = await params;
        const body = await req.json();

        // ── 1. Find the target booking ──
        const booking = await Booking.findOne({ _id: id, companyId: user.companyId });
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // ── 2. Apply shared + personal fields to THIS document ──
        [...SHARED_FIELDS, ...PERSONAL_FIELDS].forEach((field) => {
            if (body[field] !== undefined) {
                // Timesheet is technician-specific; merge so partial updates don't wipe existing values.
                if (field === "timesheet") {
                    (booking as any).timesheet = {
                        ...((booking as any).timesheet || {}),
                        ...(body.timesheet || {}),
                    };
                } else {
                    (booking as any)[field] = body[field];
                }
            }
        });

        // ── 2.1 Recalculate billed hours for this technician ──
        // billedHours = (cleaningTime + drivingTime) / 60
        const cleaningTime = Number((booking as any)?.timesheet?.cleaningTime) || 0;
        const drivingTime = Number((booking as any)?.timesheet?.drivingTime) || 0;
        const billedHours = Number(((cleaningTime + drivingTime) / 60).toFixed(2));
        (booking as any).pricing = {
            ...((booking as any).pricing || {}),
            billedHours,
        };
        console.log("billedHours", billedHours);

        await booking.save();

        // ── 3. Sync SHARED fields to every co-tech document in the same slot ──
        //
        // "Same slot" = same recurringGroupId AND same startDateTime.
        //   • For a once booking with 2 techs  → 2 docs same date  → both updated
        //   • For a recurring booking 8 weeks × 2 techs → only the
        //     specific occurrence (week) updates; other weeks untouched
        //
        if (booking.recurringGroupId) {
            // Collect only the fields from body that are in SHARED_FIELDS
            const syncPayload: Record<string, any> = {};
            SHARED_FIELDS.forEach((field) => {
                if (body[field] !== undefined) {
                    syncPayload[field] = body[field];
                }
            });

            if (Object.keys(syncPayload).length > 0) {
                await Booking.updateMany(
                    {
                        recurringGroupId: booking.recurringGroupId,
                        startDateTime: booking.startDateTime, // same occurrence only
                        _id: { $ne: booking._id },            // skip current doc
                        companyId: user.companyId,
                    },
                    { $set: syncPayload }
                );
            }
        }

        // ── 4. Recalculate general time from selected service units ──
        // generalTime = sum(estimatedTime(service) * selectedUnits)
        const generalTime = await calculateGeneralTimeMinutes(booking);
        if (booking.recurringGroupId) {
            await Booking.updateMany(
                {
                    recurringGroupId: booking.recurringGroupId,
                    startDateTime: booking.startDateTime,
                    companyId: user.companyId,
                },
                { $set: { "timesheet.generalTime": generalTime } }
            );
        } else {
            await Booking.updateOne(
                { _id: booking._id, companyId: user.companyId },
                { $set: { "timesheet.generalTime": generalTime } }
            );
        }

        // ── 5. Recalculate total team time for this booking slot ──
        // Team time = sum of technician-specific cleaningTime for all docs
        // that belong to the same recurring slot.
        if (booking.recurringGroupId) {
            const slotBookings = await Booking.find(
                {
                    recurringGroupId: booking.recurringGroupId,
                    startDateTime: booking.startDateTime,
                    companyId: user.companyId,
                },
                { "timesheet.cleaningTime": 1 }
            ).lean();

            const totalTeamTime = slotBookings.reduce(
                (sum: number, b: any) => sum + (Number(b?.timesheet?.cleaningTime) || 0),
                0
            );

            await Booking.updateMany(
                {
                    recurringGroupId: booking.recurringGroupId,
                    startDateTime: booking.startDateTime,
                    companyId: user.companyId,
                },
                { $set: { "timesheet.totalTeamTime": totalTeamTime } }
            );
        } else {
            const ownCleaningTime = Number((booking as any)?.timesheet?.cleaningTime) || 0;
            await Booking.updateOne(
                { _id: booking._id, companyId: user.companyId },
                { $set: { "timesheet.totalTeamTime": ownCleaningTime } }
            );
        }

        const refreshedBooking = await Booking.findOne({ _id: booking._id, companyId: user.companyId });
        return NextResponse.json(refreshedBooking);
    } catch (error: any) {
        console.error("Error updating booking:", error);
        return NextResponse.json(
            { error: "Failed to update booking" },
            { status: 500 }
        );
    }
}

// ─── DELETE — Delete booking + all co-tech docs for same slot ────────────────
// Problem solved:
//   ✅ Delete Complexity — deleting one tech's doc deletes ALL techs for
//                         that specific appointment slot, keeping other
//                         recurring occurrences intact
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // ── 1. Find the booking first (to get group info) ──
        const booking = await Booking.findOne({ _id: id, companyId: user.companyId });
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        let deletedCount = 1;

        if (booking.recurringGroupId) {
            // ── 2a. Delete ALL co-tech docs for this specific date slot ──
            //   • Same recurringGroupId  → same booking session
            //   • Same startDateTime     → same occurrence (not other recurring dates)
            const result = await Booking.deleteMany({
                recurringGroupId: booking.recurringGroupId,
                startDateTime: booking.startDateTime,
                companyId: user.companyId,
            });
            deletedCount = result.deletedCount ?? 1;
        } else {
            // ── 2b. Standalone booking (no group) — just delete this one ──
            await booking.deleteOne();
        }

        return NextResponse.json({
            message: `Booking slot deleted successfully (${deletedCount} document(s) removed)`,
        });
    } catch (error: any) {
        console.error("Error deleting booking:", error);
        return NextResponse.json(
            { error: "Failed to delete booking" },
            { status: 500 }
        );
    }
}
