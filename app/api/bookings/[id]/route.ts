import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";

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
    "shippingAddress",
    "pricing",
] as const;

// Fields that are only personal to this specific booking document
// (e.g. reassigning one tech while keeping others)
const PERSONAL_FIELDS = ["technicianId", "technicianIds"] as const;

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
                (booking as any)[field] = body[field];
            }
        });

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

        return NextResponse.json(booking);
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
