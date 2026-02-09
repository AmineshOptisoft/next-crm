import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ServiceArea } from "@/app/models/ServiceArea";
import { User } from "@/app/models/User";
import { Company } from "@/app/models/Company";
import { Booking } from "@/app/models/Booking";
import { Service } from "@/app/models/Service";


// GET - Fetch resources (service areas + technicians) and availability events
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Fetch service areas
        const serviceAreas = await ServiceArea.find({ companyId: user.companyId }).sort({ name: 1 });
        console.log("Service Areas found:", serviceAreas.length, serviceAreas.map(a => a.name));

        // Fetch all technicians
        const technicians = await User.find({
            companyId: user.companyId,
            role: "company_user",
            isTechnicianActive: true
        }).select('firstName lastName zone availability services').lean();
        console.log("Technicians found:", technicians.length, technicians.map((t: any) => ({ name: `${t.firstName} ${t.lastName}`, zone: t.zone })));

        // Fetch master availability (use default when empty so week/month don't show all red)
        const company = await Company.findById(user.companyId).lean();
        let masterAvailability = normalizeAvailability(company?.masterAvailability);
        if (masterAvailability.length === 0) {
            masterAvailability = getDefaultMasterAvailability();
        }
        console.log("Master availability:", masterAvailability.length);

        // Build resources array (technicians grouped by service area)
        const resources: any[] = [];
        const availabilityEvents: any[] = [];

        // Group technicians by service area
        const techniciansByZone = new Map<string, any[]>();

        technicians.forEach(tech => {
            const zone = tech.zone || "Unassigned";
            if (!techniciansByZone.has(zone)) {
                techniciansByZone.set(zone, []);
            }
            techniciansByZone.get(zone)!.push(tech);
        });

        // Add service areas and their technicians (Unassigned zone excluded from appointments)
        serviceAreas.forEach(area => {
            const zoneTechs = techniciansByZone.get(area.name) || [];

            zoneTechs.forEach(tech => {
                resources.push({
                    id: tech._id.toString(),
                    title: `${tech.firstName} ${tech.lastName}`,
                    group: area.name,
                    services: tech.services || [] // Include assigned services
                });

                // Generate availability blocks (normalize tech availability from DB)
                const blocks = generateAvailabilityBlocks(
                    tech._id.toString(),
                    masterAvailability,
                    normalizeAvailability(tech.availability)
                );
                availabilityEvents.push(...blocks);
            });
        });

        // Fetch bookings and add them as yellow events
        const bookings = await Booking.find({ companyId: user.companyId })
            .populate('contactId', 'firstName lastName email phone')
            .populate('serviceId', 'name')
            .lean();

        // Collect all unique service IDs from subServices and addons
        const serviceIds = new Set<string>();
        bookings.forEach((booking: any) => {
            booking.subServices?.forEach((sub: any) => {
                if (sub.serviceId) serviceIds.add(sub.serviceId.toString());
            });
            booking.addons?.forEach((addon: any) => {
                if (addon.serviceId) serviceIds.add(addon.serviceId.toString());
            });
        });

        // Fetch all services in one query
        const services = await Service.find({ _id: { $in: Array.from(serviceIds) } }).select('_id name').lean();
        const serviceMap = new Map(services.map((s: any) => [s._id.toString(), s.name]));

        const bookingEvents = bookings.map((booking: any) => {
            // Format address
            const addr = booking.shippingAddress;
            const formattedAddress = addr ? `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}` : '';

            // Format units (sub-services) with service names from map
            const units = booking.subServices?.map((sub: any) => {
                const serviceName = serviceMap.get(sub.serviceId?.toString()) || 'Unknown';
                return `${serviceName} (x${sub.quantity})`;
            }).join(', ') || '';

            // Format addons with service names from map
            const addons = booking.addons?.map((addon: any) => {
                const serviceName = serviceMap.get(addon.serviceId?.toString()) || 'Unknown';
                return `${serviceName} (x${addon.quantity})`;
            }).join(', ') || '';

            return {
                id: `booking-${booking._id}`,
                resourceId: booking.technicianId?.toString(),
                title: `${booking.contactId?.firstName || ''} ${booking.contactId?.lastName || ''} - ${booking.serviceId?.name || 'Service'}`,
                start: new Date(booking.startDateTime),
                end: new Date(booking.endDateTime),
                backgroundColor: (() => {
                    switch (booking.status) {
                        case 'unconfirmed': return '#ea580c'; // Orange
                        case 'confirmed':
                        case 'scheduled': return '#eab308'; // Yellow
                        case 'invoice_sent': return '#2563eb'; // Blue
                        case 'paid': return '#16a34a'; // Green
                        case 'closed': return '#4b5563'; // Gray
                        case 'rejected':
                        case 'cancelled': return '#dc2626'; // Red
                        case 'completed': return '#10b981'; // Teal
                        default: return '#eab308';
                    }
                })(),
                borderColor: "#ca8a04",
                textColor: "#000000",
                type: "booking",
                extendedProps: {
                    bookingId: booking._id,
                    bookingStatus: booking.status,
                    service: booking.serviceId?.name,
                    units: units,
                    addons: addons,
                    notes: booking.notes,
                    bookingPrice: booking.pricing?.finalAmount ? `$${booking.pricing.finalAmount.toFixed(2)}` : '-',
                    bookingDiscount: booking.pricing?.discount ? `$${booking.pricing.discount}` : '-',

                    customerName: `${booking.contactId?.firstName || ''} ${booking.contactId?.lastName || ''}`,
                    customerEmail: booking.contactId?.email,
                    customerPhone: booking.contactId?.phone,
                    customerAddress: formattedAddress,

                    // Maps to Calendar.tsx mapping
                    status: booking.status
                }
            };
        });


        return NextResponse.json({
            resources,
            events: [...availabilityEvents, ...bookingEvents]
        });
    } catch (error: any) {
        console.error("Error fetching appointment resources:", error);
        return NextResponse.json(
            { error: "Failed to fetch resources" },
            { status: 500 }
        );
    }
}

// Helper function to generate availability blocks (supports multiple weeks for calendar navigation)
function generateAvailabilityBlocks(
    technicianId: string,
    masterAvailability: any[],
    technicianAvailability: any[]
) {
    const blocks: any[] = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // When technician has no availability set, use master so company hours show as available
    const effectiveTechAvailability =
        technicianAvailability && technicianAvailability.length > 0
            ? technicianAvailability
            : masterAvailability;

    // Generate blocks for a wide date range so calendar shows availability when navigating
    const today = new Date();
    const startRange = new Date(today);
    startRange.setDate(today.getDate() - 28); // 4 weeks back

    // Monday = 0 for alignment with days[] (index 0 = Monday)
    const getMondayOfWeek = (d: Date) => {
        const m = new Date(d);
        const day = m.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Sunday -> previous Monday
        m.setDate(m.getDate() + diff);
        m.setHours(0, 0, 0, 0);
        return m;
    };

    const weekStart = getMondayOfWeek(startRange);
    const totalWeeks = 30; // ~4 weeks back + ~26 forward so calendar always has blocks

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
        const w = new Date(weekStart);
        w.setDate(weekStart.getDate() + weekIndex * 7);
        days.forEach((day, index) => {
            const date = new Date(w);
            date.setDate(w.getDate() + index);

            const masterDay = masterAvailability.find((m: any) => m.day === day);
            const techDay = effectiveTechAvailability.find((t: any) => t.day === day);

            // If either master or technician is closed, mark entire day as unavailable
            if (!masterDay?.isOpen || !techDay?.isOpen) {
                const blockStart = new Date(date);
                blockStart.setHours(0, 0, 0, 0);
                const blockEnd = new Date(date);
                blockEnd.setHours(23, 59, 59, 999);
                blocks.push({
                    id: `unavailable-${technicianId}-${date.toISOString().slice(0, 10)}-${day}`,
                    resourceId: technicianId,
                    start: blockStart,
                    end: blockEnd,
                    title: "Not Available",
                    backgroundColor: "#ef4444",
                    display: "background",
                    type: "unavailability"
                });
            } else {
                // DAY VIEW FIX:
                // For days that are open, we create time-based unavailability
                // blocks ONLY for the day view (before/after working hours).
                // Week/Month views will ignore these via the calendar filter.

                const masterStart = parseTime(masterDay.startTime);
                const masterEnd = parseTime(masterDay.endTime);
                const techStart = parseTime(techDay.startTime);
                const techEnd = parseTime(techDay.endTime);

                // Effective working window is the intersection of company + tech hours
                const effectiveStart = Math.max(masterStart, techStart);
                const effectiveEnd = Math.min(masterEnd, techEnd);

                // Block before working hours
                if (effectiveStart > 0) {
                    const blockStart = new Date(date);
                    blockStart.setHours(0, 0, 0, 0);
                    const blockEnd = new Date(date);
                    blockEnd.setHours(Math.floor(effectiveStart / 60), effectiveStart % 60, 0, 0);

                    blocks.push({
                        id: `unavailable-${technicianId}-${date.toISOString().slice(0, 10)}-${day}-before`,
                        resourceId: technicianId,
                        start: blockStart,
                        end: blockEnd,
                        title: "Not Available",
                        backgroundColor: "#ef4444",
                        display: "background",
                        type: "unavailability_timed", // used only in Day view
                    });
                }

                // Block after working hours
                if (effectiveEnd < 1440) {
                    const blockStart = new Date(date);
                    blockStart.setHours(Math.floor(effectiveEnd / 60), effectiveEnd % 60, 0, 0);
                    const blockEnd = new Date(date);
                    blockEnd.setHours(23, 59, 59, 999);

                    blocks.push({
                        id: `unavailable-${technicianId}-${date.toISOString().slice(0, 10)}-${day}-after`,
                        resourceId: technicianId,
                        start: blockStart,
                        end: blockEnd,
                        title: "Not Available",
                        backgroundColor: "#ef4444",
                        display: "background",
                        type: "unavailability_timed", // used only in Day view
                    });
                }
            }
        });
    }

    return blocks;
}

// Normalize availability array from DB (plain objects, consistent day names: Monday-Sunday)
function normalizeAvailability(arr: any): { day: string; isOpen: boolean; startTime: string; endTime: string }[] {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const toDay = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return arr
        .map((item: any) => {
            const rawDay = typeof item?.day === "string" ? item.day.trim() : "";
            const day = toDay(rawDay);
            return {
                day: days.includes(day) ? day : "",
                isOpen: Boolean(item?.isOpen),
                startTime: typeof item?.startTime === "string" ? item.startTime : "09:00 AM",
                endTime: typeof item?.endTime === "string" ? item.endTime : "06:00 PM"
            };
        })
        .filter((item: any) => item.day);
}

// Default master availability when company has none set (matches company-settings behavior)
function getDefaultMasterAvailability() {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days.map(day => ({
        day,
        isOpen: day !== "Saturday" && day !== "Sunday",
        startTime: "09:00 AM",
        endTime: "06:00 PM"
    }));
}

// Helper to convert time string to minutes (e.g. "09:00 AM"); returns 0-1440, default 0 for invalid
function parseTime(timeStr: string | undefined): number {
    if (typeof timeStr !== "string" || !timeStr.trim()) return 0;
    const parts = timeStr.trim().split(" ");
    const period = parts[1];
    const timePart = parts[0];
    if (!timePart || !period) return 0;
    const [h, m] = timePart.split(":").map(Number);
    if (Number.isNaN(h)) return 0;
    let hours = h;
    const minutes = Number.isNaN(m) ? 0 : m;
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
    return Math.min(1440, Math.max(0, hours * 60 + minutes));
}
