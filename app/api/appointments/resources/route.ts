import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ServiceArea } from "@/app/models/ServiceArea";
import { User } from "@/app/models/User";
import { Company } from "@/app/models/Company";
import { Booking } from "@/app/models/Booking";
import { Service } from "@/app/models/Service";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";

// ULTRA OPTIMIZATION: Reduce availability generation from 30 weeks to 8 weeks
// This alone can reduce 70% of processing time
const WEEKS_TO_GENERATE = 8; // 4 weeks back + 4 weeks forward

// GET - Fetch resources and availability events (ULTRA OPTIMIZED)
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Get date range for bookings (only fetch relevant bookings)
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 28);
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 56); // 8 weeks forward

        // CRITICAL: Run ALL queries in parallel with optimized filters
        const [serviceAreas, technicians, company, bookings, timeOffs] = await Promise.all([
            // Only fetch name - nothing else needed
            ServiceArea.find({ companyId: user.companyId })
                .select('name')
                .sort({ name: 1 })
                .lean()
                .exec(),
            
            // Only active technicians with minimal fields
            User.find({
                companyId: user.companyId,
                role: "company_user",
                isTechnicianActive: true
            })
            .select('firstName lastName zone availability services')
            .lean()
            .exec(),
            
            // Only master availability
            Company.findById(user.companyId)
                .select('masterAvailability')
                .lean()
                .exec(),
            
            // CRITICAL: Only fetch bookings in date range
            Booking.find({ 
                companyId: user.companyId,
                startDateTime: { 
                    $gte: startDate,
                    $lte: endDate 
                }
            })
            .populate('contactId', 'firstName lastName email phone')
            .populate('serviceId', 'name')
            .select('technicianId startDateTime endDateTime status subServices addons notes pricing shippingAddress')
            .lean()
            .exec(),

            // Fetch Technician Time Offs
            TechnicianTimeOff.find({
                startDate: { $gte: startDate },
                endDate: { $lte: endDate },
                status: "APPROVED"
            }).lean().exec()
        ]);

        // Fast master availability setup
        let masterAvailability = normalizeAvailability(company?.masterAvailability);
        if (masterAvailability.length === 0) {
            masterAvailability = DEFAULT_MASTER_AVAILABILITY;
        }

        // Pre-build maps for O(1) lookups
        const masterMap = new Map(masterAvailability.map(m => [m.day, m]));
        const serviceAreaMap = new Map(serviceAreas.map(sa => [sa.name, sa]));

        // Collect service IDs (if needed)
        const serviceIds = new Set<string>();
        bookings.forEach((booking: any) => {
            booking.subServices?.forEach((sub: any) => {
                if (sub.serviceId) serviceIds.add(sub.serviceId.toString());
            });
            booking.addons?.forEach((addon: any) => {
                if (addon.serviceId) serviceIds.add(addon.serviceId.toString());
            });
        });

        // Fetch services only if needed
        const serviceMap = serviceIds.size > 0 
            ? new Map((await Service.find({ _id: { $in: Array.from(serviceIds) } })
                .select('_id name')
                .lean()
                .exec()).map((s: any) => [s._id.toString(), s.name]))
            : new Map();

        // Build resources and availability events efficiently
        const resources: any[] = [];
        const availabilityEvents: any[] = [];

        // Group technicians by zone (single pass)
        const techniciansByZone = new Map<string, any[]>();
        technicians.forEach(tech => {
            const zone = tech.zone || "Unassigned";
            const list = techniciansByZone.get(zone);
            if (list) {
                list.push(tech);
            } else {
                techniciansByZone.set(zone, [tech]);
            }
        });

        // Process each service area and its technicians
        serviceAreas.forEach(area => {
            const zoneTechs = techniciansByZone.get(area.name) || [];

            zoneTechs.forEach(tech => {
                resources.push({
                    id: tech._id.toString(),
                    title: `${tech.firstName} ${tech.lastName}`,
                    group: area.name,
                    services: tech.services || []
                });

                // Generate availability blocks (reduced weeks)
                const techAvailability = normalizeAvailability(tech.availability);
                const effectiveAvailability = techAvailability.length > 0 ? techAvailability : masterAvailability;
                const techMap = new Map(effectiveAvailability.map(t => [t.day, t]));

                const blocks = generateAvailabilityBlocksFast(
                    tech._id.toString(),
                    masterMap,
                    techMap
                );
                availabilityEvents.push(...blocks);
            });
        });

        // Process booking events
        const bookingEvents = bookings.map((booking: any) => {
            const addr = booking.shippingAddress;
            const formattedAddress = addr 
                ? `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim() 
                : '';

            const units = booking.subServices?.map((sub: any) => 
                `${serviceMap.get(sub.serviceId?.toString()) || 'Unknown'} (x${sub.quantity})`
            ).join(', ') || '';

            const addons = booking.addons?.map((addon: any) => 
                `${serviceMap.get(addon.serviceId?.toString()) || 'Unknown'} (x${addon.quantity})`
            ).join(', ') || '';

            return {
                id: `booking-${booking._id}`,
                resourceId: booking.technicianId?.toString(),
                title: `${booking.contactId?.firstName || ''} ${booking.contactId?.lastName || ''} - ${booking.serviceId?.name || 'Service'}`,
                start: booking.startDateTime,
                end: booking.endDateTime,
                backgroundColor: STATUS_COLORS[booking.status] || '#eab308',
                borderColor: "#ca8a04",
                textColor: "#000000",
                type: "booking",
                extendedProps: {
                    bookingId: booking._id,
                    bookingStatus: booking.status,
                    service: booking.serviceId?.name,
                    units,
                    addons,
                    notes: booking.notes,
                    bookingPrice: booking.pricing?.finalAmount ? `$${booking.pricing.finalAmount.toFixed(2)}` : '-',
                    bookingDiscount: booking.pricing?.discount ? `$${booking.pricing.discount}` : '-',
                    customerName: `${booking.contactId?.firstName || ''} ${booking.contactId?.lastName || ''}`,
                    customerEmail: booking.contactId?.email,
                    customerPhone: booking.contactId?.phone,
                    customerAddress: formattedAddress,
                    status: booking.status
                }
            };
        });

        // Process time-off events
        const timeOffEvents = timeOffs.map((off: any) => {
            const start = new Date(off.startDate);
            const startTimeMinutes = parseTimeFast(off.startTime);
            start.setHours(Math.floor(startTimeMinutes / 60), startTimeMinutes % 60, 0, 0);

            const end = new Date(off.endDate);
            const endTimeMinutes = parseTimeFast(off.endTime);
            end.setHours(Math.floor(endTimeMinutes / 60), endTimeMinutes % 60, 0, 0);

            return {
                id: `timeoff-${off._id}`,
                resourceId: off.technicianId.toString(),
                title: `Off: ${off.reason}`,
                start: start,
                end: end,
                backgroundColor: "#71717a", 
                borderColor: "#52525b",
                textColor: "#ffffff",
                display: "background",
                type: "unavailability", 
                extendedProps: {
                    type: "time_off",
                    notes: off.notes,
                    reason: off.reason,
                    status: off.status
                }
            };
        });

        return NextResponse.json({
            resources,
            events: [...availabilityEvents, ...bookingEvents, ...timeOffEvents]
        });
    } catch (error: any) {
        console.error("Error fetching appointment resources:", error);
        return NextResponse.json(
            { error: "Failed to fetch resources" },
            { status: 500 }
        );
    }
}

// Status colors lookup (constant)
const STATUS_COLORS: Record<string, string> = {
    'unconfirmed': '#ea580c',
    'confirmed': '#eab308',
    'scheduled': '#eab308',
    'invoice_sent': '#2563eb',
    'paid': '#16a34a',
    'closed': '#4b5563',
    'rejected': '#dc2626',
    'cancelled': '#dc2626',
    'completed': '#10b981'
};

// Default master availability (constant)
const DEFAULT_MASTER_AVAILABILITY = [
    { day: "Monday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Tuesday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Wednesday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Thursday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Friday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Saturday", isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
    { day: "Sunday", isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" }
];

// Day names constant
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ULTRA FAST: Generate availability blocks with reduced week range
function generateAvailabilityBlocksFast(
    technicianId: string,
    masterMap: Map<string, any>,
    techMap: Map<string, any>
) {
    const blocks: any[] = [];
    
    // Calculate date range once
    const today = new Date();
    const startRange = new Date(today);
    startRange.setDate(today.getDate() - 28); // 4 weeks back

    // Get Monday of the start week
    const weekStart = getMondayOfWeek(startRange);

    // CRITICAL: Reduced from 30 weeks to 8 weeks (70% reduction in processing)
    for (let weekIndex = 0; weekIndex < WEEKS_TO_GENERATE; weekIndex++) {
        const weekOffset = weekIndex * 7;
        
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + weekOffset + dayIndex);
            
            const day = DAY_NAMES[dayIndex];
            const masterDay = masterMap.get(day);
            const techDay = techMap.get(day);

            // If closed, create single unavailable block for entire day
            if (!masterDay?.isOpen || !techDay?.isOpen) {
                blocks.push({
                    id: `unavail-${technicianId}-${date.toISOString().slice(0, 10)}`,
                    resourceId: technicianId,
                    start: new Date(date.setHours(0, 0, 0, 0)),
                    end: new Date(date.setHours(23, 59, 59, 999)),
                    title: "Not Available",
                    backgroundColor: "#ef4444",
                    display: "background",
                    type: "unavailability"
                });
            } else {
                // Calculate effective working hours
                const masterStart = parseTimeFast(masterDay.startTime);
                const masterEnd = parseTimeFast(masterDay.endTime);
                const techStart = parseTimeFast(techDay.startTime);
                const techEnd = parseTimeFast(techDay.endTime);

                const effectiveStart = Math.max(masterStart, techStart);
                const effectiveEnd = Math.min(masterEnd, techEnd);

                // Block before working hours
                if (effectiveStart > 0) {
                    const startHour = Math.floor(effectiveStart / 60);
                    const startMin = effectiveStart % 60;
                    
                    blocks.push({
                        id: `unavail-${technicianId}-${date.toISOString().slice(0, 10)}-before`,
                        resourceId: technicianId,
                        start: new Date(new Date(date).setHours(0, 0, 0, 0)),
                        end: new Date(new Date(date).setHours(startHour, startMin, 0, 0)),
                        title: "Not Available",
                        backgroundColor: "#ef4444",
                        display: "background",
                        type: "unavailability_timed"
                    });
                }

                // Block after working hours
                if (effectiveEnd < 1440) {
                    const endHour = Math.floor(effectiveEnd / 60);
                    const endMin = effectiveEnd % 60;
                    
                    blocks.push({
                        id: `unavail-${technicianId}-${date.toISOString().slice(0, 10)}-after`,
                        resourceId: technicianId,
                        start: new Date(new Date(date).setHours(endHour, endMin, 0, 0)),
                        end: new Date(new Date(date).setHours(23, 59, 59, 999)),
                        title: "Not Available",
                        backgroundColor: "#ef4444",
                        display: "background",
                        type: "unavailability_timed"
                    });
                }
            }
        }
    }

    return blocks;
}

// Get Monday of week
function getMondayOfWeek(d: Date): Date {
    const m = new Date(d);
    const day = m.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    m.setDate(m.getDate() + diff);
    m.setHours(0, 0, 0, 0);
    return m;
}

// Time parsing cache
const TIME_CACHE = new Map<string, number>();

// ULTRA FAST: Parse time with caching and regex
function parseTimeFast(timeStr: string | undefined): number {
    if (!timeStr) return 0;
    
    // Check cache
    const cached = TIME_CACHE.get(timeStr);
    if (cached !== undefined) return cached;

    // Fast regex parse
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
        TIME_CACHE.set(timeStr, 0);
        return 0;
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const result = hours * 60 + minutes;
    TIME_CACHE.set(timeStr, result);
    
    return result;
}

// Normalize availability with Set for O(1) lookup
const DAY_SET = new Set(DAY_NAMES);

function normalizeAvailability(arr: any): { day: string; isOpen: boolean; startTime: string; endTime: string }[] {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    
    return arr
        .map((item: any) => {
            const day = item?.day?.trim();
            if (!day) return null;
            
            const normalized = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
            if (!DAY_SET.has(normalized)) return null;
            
            return {
                day: normalized,
                isOpen: Boolean(item?.isOpen),
                startTime: item?.startTime || "09:00 AM",
                endTime: item?.endTime || "06:00 PM"
            };
        })
        .filter(Boolean) as any[];
}