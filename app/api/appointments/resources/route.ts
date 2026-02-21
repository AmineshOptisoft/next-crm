import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ServiceArea } from "@/app/models/ServiceArea";
import { User } from "@/app/models/User";
import { Company } from "@/app/models/Company";
import { Booking } from "@/app/models/Booking";
import { Service } from "@/app/models/Service";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import mongoose from "mongoose";

// ─── Constants (module-level, never re-created) ───────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    unconfirmed:  '#ea580c',
    confirmed:    '#eab308',
    scheduled:    '#eab308',
    invoice_sent: '#2563eb',
    paid:         '#16a34a',
    closed:       '#4b5563',
    rejected:     '#dc2626',
    cancelled:    '#dc2626',
    completed:    '#10b981',
};

const DEFAULT_MASTER_AVAILABILITY = [
    { day: "Monday",    isOpen: true,  startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Tuesday",   isOpen: true,  startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Wednesday", isOpen: true,  startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Thursday",  isOpen: true,  startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Friday",    isOpen: true,  startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Saturday",  isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Sunday",    isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
];

// Monday-first day index → name (matches JS getDay() remapped below)
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SET   = new Set(DAY_NAMES);

// Module-level time-string parse cache (persists across requests in the same worker)
const TIME_CACHE = new Map<string, number>();

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    try {
        // 1. Auth + URL parsing (no DB yet)
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const paramStart = searchParams.get("start");
        const paramEnd   = searchParams.get("end");

        const today = new Date();
        const startDate = paramStart
            ? new Date(paramStart)
            : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28);
        const endDate = paramEnd
            ? new Date(paramEnd)
            : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 56);

        await connectDB();

        const companyObjId = new mongoose.Types.ObjectId(user.companyId);

        // 2. All DB work in ONE parallel round ─────────────────────────────────
        //    Bookings now use $lookup aggregation instead of .populate()
        //    so contact + service data arrive in a single query (no hidden N+1).
        const [serviceAreas, technicians, company, bookingsRaw, timeOffs] = await Promise.all([

            ServiceArea.find({ companyId: user.companyId })
                .select("name")
                .sort({ name: 1 })
                .lean()
                .exec(),

            User.find({
                companyId: user.companyId,
                role: "company_user",
                isTechnicianActive: true,
            })
                .select("firstName lastName zone availability services")
                .lean()
                .exec(),

            Company.findById(user.companyId)
                .select("masterAvailability")
                .lean()
                .exec(),

            // Single aggregation replaces two .populate() calls
            Booking.aggregate([
                {
                    $match: {
                        companyId: companyObjId,
                        startDateTime: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "contactId",
                        foreignField: "_id",
                        pipeline: [{ $project: {
                            firstName: 1,
                            lastName: 1,
                            email: 1,
                            phoneNumber: 1,
                            familyInfo: 1,
                            parkingAccess: 1,
                            clientNotesFromTech: 1,
                            specialInstructionsClient: 1,
                            specialInstructionsAdmin: 1,
                            billingNotes: 1,
                            preferences: 1,
                            preferredTechnician: 1,
                        }}],
                        as: "_contact",
                    },
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "serviceId",
                        foreignField: "_id",
                        pipeline: [{ $project: { name: 1 } }],
                        as: "_service",
                    },
                },
                {
                    $project: {
                        technicianId: 1,
                        startDateTime: 1,
                        endDateTime: 1,
                        status: 1,
                        subServices: 1,
                        addons: 1,
                        notes: 1,
                        pricing: 1,
                        shippingAddress: 1,
                        recurringGroupId: 1,
                        contact: { $arrayElemAt: ["$_contact", 0] },
                        service:  { $arrayElemAt: ["$_service",  0] },
                    },
                },
            ]),

            // Time-offs that overlap the range (not just fully contained)
            TechnicianTimeOff.find({
                startDate: { $lte: endDate },
                endDate:   { $gte: startDate },
                status: "APPROVED",
            })
                .select("technicianId startDate endDate startTime endTime reason notes status")
                .lean()
                .exec(),
        ]);

        // 3. Collect unique sub-service / addon service IDs from bookings ───────
        const serviceIds = new Set<string>();
        for (const b of bookingsRaw as any[]) {
            b.subServices?.forEach((s: any) => s.serviceId && serviceIds.add(s.serviceId.toString()));
            b.addons?.forEach((a: any)       => a.serviceId && serviceIds.add(a.serviceId.toString()));
        }

        // 4. Fetch sub-service names only if any exist (still parallel-able but ─
        //    usually small; keep separate to avoid bloating main round)
        const serviceMap: Map<string, string> =
            serviceIds.size > 0
                ? new Map(
                      (
                          await Service.find({ _id: { $in: [...serviceIds] } })
                              .select("_id name")
                              .lean()
                              .exec()
                      ).map((s: any) => [s._id.toString(), s.name])
                  )
                : new Map();

        // 5. Master availability → precomputed numeric tuple map ───────────────
        //    { day → [effectiveStartMin, effectiveEndMin, isOpen] }
        let masterAvailability = normalizeAvailability((company as any)?.masterAvailability);
        if (masterAvailability.length === 0) masterAvailability = DEFAULT_MASTER_AVAILABILITY;

        // masterNumericMap: day → { isOpen, start, end } in minutes
        const masterNumericMap = buildNumericMap(masterAvailability);

        // 6. Group technicians by zone (single pass) ───────────────────────────
        const techsByZone = new Map<string, any[]>();
        for (const tech of technicians as any[]) {
            const zone = tech.zone || "Unassigned";
            const arr  = techsByZone.get(zone);
            arr ? arr.push(tech) : techsByZone.set(zone, [tech]);
        }

        // 7. Build resources + availability blocks ────────────────────────────
        const resources: any[]           = [];
        const availabilityEvents: any[]  = [];

        // Precompute range timestamps to avoid repeated .getTime() calls
        const rangeStartMs = getMondayOfWeekMs(startDate.getTime());
        const rangeEndMs   = endDate.getTime();
        const ONE_DAY_MS   = 86_400_000;

        for (const area of serviceAreas as any[]) {
            const zoneTechs = techsByZone.get(area.name) || [];

            for (const tech of zoneTechs) {
                const techId = tech._id.toString();

                resources.push({
                    id:       techId,
                    title:    `${tech.firstName} ${tech.lastName}`,
                    group:    area.name,
                    services: tech.services || [],
                });

                // Per-tech numeric availability map (7 entries max)
                const techNorm    = normalizeAvailability(tech.availability);
                const effectiveNorm = techNorm.length > 0 ? techNorm : masterAvailability;
                const techNumericMap = buildNumericMap(effectiveNorm);

                const blocks = generateAvailabilityBlocks(
                    techId,
                    masterNumericMap,
                    techNumericMap,
                    rangeStartMs,
                    rangeEndMs,
                    ONE_DAY_MS
                );
                availabilityEvents.push(...blocks);
            }
        }

        // 8. Build co-technician lookup for multi-tech bookings ──────────────────
        //    All technicians work simultaneously (same start/end), so we keep
        //    the original times and just expose who else is on the booking.

        // techId → full name (from the already-fetched technicians array, no extra DB call)
        const techNameMap = new Map<string, string>();
        for (const tech of technicians as any[]) {
            techNameMap.set(
                tech._id.toString(),
                `${tech.firstName || ""} ${tech.lastName || ""}`.trim()
            );
        }

        // Group by recurringGroupId + startDateTime to find shared appointments
        // booking._id (string) → names of ALL other techs in the same slot
        const coTechMap = new Map<string, string[]>();

        if ((bookingsRaw as any[]).some((b: any) => b.recurringGroupId)) {
            const groupMap = new Map<string, any[]>();
            for (const booking of bookingsRaw as any[]) {
                if (!booking.recurringGroupId) continue;
                const key = `${booking.recurringGroupId}::${new Date(booking.startDateTime).toISOString()}`;
                const arr = groupMap.get(key);
                arr ? arr.push(booking) : groupMap.set(key, [booking]);
            }

            for (const group of groupMap.values()) {
                if (group.length <= 1) continue; // single-tech booking — nothing to do

                // For each booking in the group, collect the OTHER technicians' names
                group.forEach((booking: any) => {
                    const others = group
                        .filter((b: any) => b._id.toString() !== booking._id.toString())
                        .map((b: any) => {
                            const id = b.technicianId?.toString();
                            return id ? (techNameMap.get(id) || "Unknown") : "Unknown";
                        });
                    coTechMap.set(booking._id.toString(), others);
                });
            }
        }

        // 9. Map booking events ────────────────────────────────────────────────
        const bookingEvents = (bookingsRaw as any[]).map((booking) => {
            const addr = booking.shippingAddress;
            const formattedAddress = addr
                ? `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.zipCode || ""}`.trim()
                : "";

            const units = booking.subServices
                ?.map((s: any) => `${serviceMap.get(s.serviceId?.toString()) || "Unknown"} (x${s.quantity})`)
                .join(", ") || "";

            const addons = booking.addons
                ?.map((a: any) => `${serviceMap.get(a.serviceId?.toString()) || "Unknown"} (x${a.quantity})`)
                .join(", ") || "";

            const contact = booking.contact || {};
            const service = booking.service  || {};

            // Co-technicians on this booking (empty array = solo booking)
            const coTechnicians = coTechMap.get(booking._id.toString()) ?? [];

            // Assigned staff = this technician + all co-technicians
            const thisName = techNameMap.get(booking.technicianId?.toString()) ?? "";
            const assignedStaff = [thisName, ...coTechnicians].filter(Boolean).join(", ");

            return {
                id:              `booking-${booking._id}`,
                resourceId:      booking.technicianId?.toString(),
                title:           `${contact.firstName || ""} ${contact.lastName || ""} - ${service.name || "Service"}`,
                start:           booking.startDateTime,
                end:             booking.endDateTime,
                backgroundColor: STATUS_COLORS[booking.status] || "#eab308",
                borderColor:     "#ca8a04",
                textColor:       "#000000",
                type:            "booking",
                extendedProps: {
                    bookingId:      booking._id,
                    bookingStatus:  booking.status,
                    service:        service.name,
                    units,
                    addons,
                    notes:          booking.notes,
                    bookingPrice:   booking.pricing?.finalAmount  ? `$${booking.pricing.finalAmount.toFixed(2)}`  : "-",
                    bookingDiscount: booking.pricing?.discount    ? `$${booking.pricing.discount}`                : "-",
                    // Customer details
                    customerName:   `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
                    customerEmail:  contact.email,
                    customerPhone:  contact.phoneNumber,
                    customerAddress: formattedAddress,
                    familyInfo:     contact.familyInfo,
                    parkingAccess:  contact.parkingAccess,
                    clientNotesFromTech: contact.clientNotesFromTech,
                    specialInstructionsFromClient: contact.specialInstructionsClient,
                    specialInstructionsFromAdmin:  contact.specialInstructionsAdmin,
                    billingNotes:   contact.billingNotes,
                    preferences:    contact.preferences,
                    preferredTechnician: contact.preferredTechnician,
                    status:         booking.status,
                    // Staff
                    assignedStaff,
                    coTechnicians,
                },
            };

        });


        // 10. Map time-off events ──────────────────────────────────────────────
        const timeOffEvents = (timeOffs as any[]).map((off) => {
            const startMs = parseTimeFast(off.startTime);
            const endMs   = parseTimeFast(off.endTime);

            const start = new Date(off.startDate);
            start.setHours(Math.floor(startMs / 60), startMs % 60, 0, 0);

            const end = new Date(off.endDate);
            end.setHours(Math.floor(endMs / 60), endMs % 60, 0, 0);

            return {
                id:              `timeoff-${off._id}`,
                resourceId:      off.technicianId.toString(),
                title:           `Off: ${off.reason}`,
                start,
                end,
                backgroundColor: "#71717a",
                borderColor:     "#52525b",
                textColor:       "#ffffff",
                display:         "background",
                type:            "unavailability",
                extendedProps: {
                    type:   "time_off",
                    notes:  off.notes,
                    reason: off.reason,
                    status: off.status,
                },
            };
        });

        return NextResponse.json({
            resources,
            events: [...availabilityEvents, ...bookingEvents, ...timeOffEvents],
        });

    } catch (error: any) {
        console.error("Error fetching appointment resources:", error);
        return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Numeric availability map: day name → { isOpen, startMin, endMin } */
type NumericDay = { isOpen: boolean; startMin: number; endMin: number };

function buildNumericMap(availability: { day: string; isOpen: boolean; startTime: string; endTime: string }[]): Map<string, NumericDay> {
    const map = new Map<string, NumericDay>();
    for (const a of availability) {
        map.set(a.day, {
            isOpen:   a.isOpen,
            startMin: parseTimeFast(a.startTime),
            endMin:   parseTimeFast(a.endTime),
        });
    }
    return map;
}

/**
 * Generate unavailability blocks using pure timestamp arithmetic —
 * no Date object created per iteration in the hot path.
 */
function generateAvailabilityBlocks(
    technicianId: string,
    masterMap: Map<string, NumericDay>,
    techMap:   Map<string, NumericDay>,
    rangeStartMs: number,   // already aligned to Monday 00:00
    rangeEndMs:   number,
    ONE_DAY_MS:   number
) {
    const blocks: any[] = [];
    let curMs = rangeStartMs;

    while (curMs <= rangeEndMs) {
        const date   = new Date(curMs);
        const jsDay  = date.getDay();                          // 0=Sun … 6=Sat
        const dayIdx = jsDay === 0 ? 6 : jsDay - 1;           // 0=Mon … 6=Sun
        const day    = DAY_NAMES[dayIdx];

        const master = masterMap.get(day);
        const tech   = techMap.get(day);

        const dateStr = date.toISOString().slice(0, 10);       // "YYYY-MM-DD"
        const dayStartMs = curMs;                              // 00:00 of this day
        const dayEndMs   = curMs + ONE_DAY_MS - 1;            // 23:59:59.999

        if (!master?.isOpen || !tech?.isOpen) {
            blocks.push({
                id:              `unavail-${technicianId}-${dateStr}`,
                resourceId:      technicianId,
                start:           new Date(dayStartMs),
                end:             new Date(dayEndMs),
                title:           "Not Available",
                backgroundColor: "#ef4444",
                display:         "background",
                type:            "unavailability",
            });
        } else {
            const effectiveStart = Math.max(master.startMin, tech.startMin); // minutes
            const effectiveEnd   = Math.min(master.endMin,   tech.endMin);

            if (effectiveStart > 0) {
                blocks.push({
                    id:              `unavail-${technicianId}-${dateStr}-before`,
                    resourceId:      technicianId,
                    start:           new Date(dayStartMs),
                    end:             new Date(dayStartMs + effectiveStart * 60_000),
                    title:           "Not Available",
                    backgroundColor: "#ef4444",
                    display:         "background",
                    type:            "unavailability_timed",
                });
            }

            if (effectiveEnd < 1440) {
                blocks.push({
                    id:              `unavail-${technicianId}-${dateStr}-after`,
                    resourceId:      technicianId,
                    start:           new Date(dayStartMs + effectiveEnd * 60_000),
                    end:             new Date(dayEndMs),
                    title:           "Not Available",
                    backgroundColor: "#ef4444",
                    display:         "background",
                    type:            "unavailability_timed",
                });
            }
        }

        curMs += ONE_DAY_MS;
    }

    return blocks;
}

/** Returns the timestamp (ms) of Monday 00:00:00.000 of the week containing `ms`. */
function getMondayOfWeekMs(ms: number): number {
    const d   = new Date(ms);
    const day = d.getDay();                       // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;       // days to subtract to reach Mon
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** Parse "HH:MM AM/PM" → total minutes, with module-level cache. */
function parseTimeFast(timeStr: string | undefined): number {
    if (!timeStr) return 0;
    const cached = TIME_CACHE.get(timeStr);
    if (cached !== undefined) return cached;

    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) { TIME_CACHE.set(timeStr, 0); return 0; }

    let hours      = parseInt(match[1], 10);
    const minutes  = parseInt(match[2], 10);
    const period   = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours  = 0;

    const result = hours * 60 + minutes;
    TIME_CACHE.set(timeStr, result);
    return result;
}

/** Normalize raw availability array, filtering invalid/unknown days. */
function normalizeAvailability(arr: any): { day: string; isOpen: boolean; startTime: string; endTime: string }[] {
    if (!Array.isArray(arr) || arr.length === 0) return [];

    const out: { day: string; isOpen: boolean; startTime: string; endTime: string }[] = [];
    for (const item of arr) {
        const raw = item?.day?.trim();
        if (!raw) continue;
        const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        if (!DAY_SET.has(normalized)) continue;
        out.push({
            day:       normalized,
            isOpen:    Boolean(item?.isOpen),
            startTime: item?.startTime || "09:00 AM",
            endTime:   item?.endTime   || "06:00 PM",
        });
    }
    return out;
}