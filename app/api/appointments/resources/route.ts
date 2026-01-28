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
        }).select('firstName lastName zone availability');
        console.log("Technicians found:", technicians.length, technicians.map(t => ({ name: `${t.firstName} ${t.lastName}`, zone: t.zone })));

        // Fetch master availability
        const company = await Company.findById(user.companyId);
        const masterAvailability = company?.masterAvailability || [];
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

        // Add service areas and their technicians
        serviceAreas.forEach(area => {
            const zoneTechs = techniciansByZone.get(area.name) || [];

            zoneTechs.forEach(tech => {
                resources.push({
                    id: tech._id.toString(),
                    title: `${tech.firstName} ${tech.lastName}`,
                    group: area.name
                });

                // Generate availability blocks for this technician
                const blocks = generateAvailabilityBlocks(
                    tech._id.toString(),
                    masterAvailability,
                    tech.availability || []
                );
                availabilityEvents.push(...blocks);
            });
        });

        // Fetch bookings and add them as yellow events
        const bookings = await Booking.find({ companyId: user.companyId })
            .populate('contactId', 'firstName lastName email phone')
            // .populate('serviceId', 'name')
            // .populate({
            //     path: "serviceId",
            //     model: "services",
            //     select: "name"
            // })
            .lean();

        const bookingEvents = bookings.map((booking: any) => ({
            id: `booking-${booking._id}`,
            resourceId: booking.technicianId?.toString(),
            title: `${booking.contactId?.firstName || ''} ${booking.contactId?.lastName || ''} - ${booking.serviceId?.name || 'Service'}`,
            start: new Date(booking.appointmentDate),
            end: new Date(booking.appointmentEndDate || booking.appointmentDate),
            backgroundColor: "#eab308", // Yellow color
            borderColor: "#ca8a04",
            textColor: "#000000",
            type: "booking",
            extendedProps: {
                bookingId: booking._id,
                contactName: `${booking.contactId?.firstName || ''} ${booking.contactId?.lastName || ''}`,
                contactEmail: booking.contactId?.email,
                contactPhone: booking.contactId?.phone,
                serviceName: booking.serviceId?.name,
                status: booking.status,
                estimatedPrice: booking.estimatedPrice,
                discount: booking.discount
            }
        }));

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

// Helper function to generate availability blocks
function generateAvailabilityBlocks(
    technicianId: string,
    masterAvailability: any[],
    technicianAvailability: any[]
) {
    const blocks: any[] = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // Get current week's dates
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

    days.forEach((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);

        const masterDay = masterAvailability.find(m => m.day === day);
        const techDay = technicianAvailability.find(t => t.day === day);

        // If either master or technician is closed, mark entire day as unavailable
        if (!masterDay?.isOpen || !techDay?.isOpen) {
            blocks.push({
                id: `unavailable-${technicianId}-${day}`,
                resourceId: technicianId,
                start: new Date(date.setHours(0, 0, 0, 0)),
                end: new Date(date.setHours(23, 59, 59, 999)),
                title: "Not Available",
                backgroundColor: "#ef4444",
                display: "background",
                type: "unavailability"
            });
        } else {
            // Add unavailable blocks before start time and after end time
            const masterStart = parseTime(masterDay.startTime);
            const masterEnd = parseTime(masterDay.endTime);
            const techStart = parseTime(techDay.startTime);
            const techEnd = parseTime(techDay.endTime);

            // Use the most restrictive times
            const effectiveStart = Math.max(masterStart, techStart);
            const effectiveEnd = Math.min(masterEnd, techEnd);

            // Block before working hours
            if (effectiveStart > 0) {
                const blockStart = new Date(date);
                blockStart.setHours(0, 0, 0, 0);
                const blockEnd = new Date(date);
                blockEnd.setHours(Math.floor(effectiveStart / 60), effectiveStart % 60, 0, 0);

                blocks.push({
                    id: `unavailable-${technicianId}-${day}-before`,
                    resourceId: technicianId,
                    start: blockStart,
                    end: blockEnd,
                    title: "Not Available",
                    backgroundColor: "#ef4444",
                    display: "background",
                    type: "unavailability"
                });
            }

            // Block after working hours
            if (effectiveEnd < 1440) {
                const blockStart = new Date(date);
                blockStart.setHours(Math.floor(effectiveEnd / 60), effectiveEnd % 60, 0, 0);
                const blockEnd = new Date(date);
                blockEnd.setHours(23, 59, 59, 999);

                blocks.push({
                    id: `unavailable-${technicianId}-${day}-after`,
                    resourceId: technicianId,
                    start: blockStart,
                    end: blockEnd,
                    title: "Not Available",
                    backgroundColor: "#ef4444",
                    display: "background",
                    type: "unavailability"
                });
            }
        }
    });

    return blocks;
}

// Helper to convert time string to minutes
function parseTime(timeStr: string): number {
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
}
