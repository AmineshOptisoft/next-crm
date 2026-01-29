import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { Service } from "@/app/models/Service";
import { v4 as uuidv4 } from "uuid";

// POST - Create booking(s)
// POST - Create booking(s)
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const {
            contactId,
            technicianId, // Legacy support (single ID)
            technicianIds = [], // New support (array of IDs)
            serviceId,
            subServices = [],
            addons = [],
            bookingType,
            frequency,
            customRecurrence,
            startDateTime,
            endDateTime,
            shippingAddress,
            notes,
            pricing
        } = body;

        // Determine list of technicians to book
        let techIdsToProcess: string[] = [];
        if (technicianIds && technicianIds.length > 0) {
            techIdsToProcess = technicianIds;
        } else if (technicianId) {
            techIdsToProcess = [technicianId];
        }

        // Validate required fields
        if (!contactId || techIdsToProcess.length === 0 || !serviceId || !startDateTime || !endDateTime) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Generate a unique Group ID for this batch of bookings
        // This ID will be shared across ALL bookings created in this request (single or recurring)
        // enabling us to track them together.
        const bookingGroupId = uuidv4();

        let allCreatedBookings: any[] = [];

        // Loop through each technician and create bookings
        for (const techId of techIdsToProcess) {
            if (bookingType === "once") {
                const booking = await Booking.create({
                    contactId,
                    technicianId: techId,
                    serviceId,
                    subServices,
                    addons,
                    bookingType,
                    startDateTime: new Date(startDateTime),
                    endDateTime: new Date(endDateTime),
                    shippingAddress,
                    notes,
                    pricing,
                    recurringGroupId: bookingGroupId, // Use the shared group ID
                    companyId: user.companyId
                });
                allCreatedBookings.push(booking);
            }
            else if (bookingType === "recurring") {
                const bookings = generateRecurringBookings({
                    contactId,
                    technicianId: techId,
                    serviceId,
                    subServices,
                    addons,
                    frequency,
                    customRecurrence,
                    startDateTime,
                    endDateTime,
                    shippingAddress,
                    notes,
                    pricing,
                    recurringGroupId: bookingGroupId, // Use the shared group ID
                    companyId: user.companyId
                });

                const created = await Booking.insertMany(bookings);
                allCreatedBookings.push(...created);
            }
        }

        return NextResponse.json({
            message: `Created ${allCreatedBookings.length} bookings for ${techIdsToProcess.length} technicians`,
            count: allCreatedBookings.length,
            bookingGroupId: bookingGroupId,
            bookings: allCreatedBookings
        }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating booking:", error);
        return NextResponse.json(
            { error: "Failed to create booking" },
            { status: 500 }
        );
    }
}

// Helper function to generate recurring bookings
function generateRecurringBookings(data: any) {
    const {
        contactId,
        technicianId,
        serviceId,
        subServices,
        addons,
        frequency,
        customRecurrence,
        startDateTime,
        endDateTime,
        shippingAddress,
        notes,
        pricing,
        recurringGroupId,
        companyId
    } = data;

    const bookings: any[] = [];
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Calculate duration of a single booking
    const bookingDuration = end.getTime() - start.getTime();

    // Generate bookings based on frequency
    if (frequency === "weekly") {
        const selectedDays = customRecurrence?.selectedDays || [];
        let currentDate = new Date(start);
        const endDate = new Date(customRecurrence?.endDate || start);
        endDate.setFullYear(endDate.getFullYear() + 1); // Max 1 year

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();

            if (selectedDays.includes(dayOfWeek)) {
                const bookingStart = new Date(currentDate);
                const bookingEnd = new Date(bookingStart.getTime() + bookingDuration);

                bookings.push({
                    contactId,
                    technicianId,
                    serviceId,
                    subServices,
                    addons,
                    bookingType: "recurring",
                    frequency,
                    customRecurrence,
                    startDateTime: bookingStart,
                    endDateTime: bookingEnd,
                    shippingAddress,
                    notes,
                    pricing,
                    recurringGroupId,
                    companyId
                });
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else if (frequency === "monthly") {
        const selectedDays = customRecurrence?.selectedDays || [];
        let currentDate = new Date(start);
        const endDate = new Date(customRecurrence?.endDate || start);
        endDate.setFullYear(endDate.getFullYear() + 1); // Max 1 year

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();

            if (selectedDays.includes(dayOfWeek)) {
                const bookingStart = new Date(currentDate);
                const bookingEnd = new Date(bookingStart.getTime() + bookingDuration);

                bookings.push({
                    contactId,
                    technicianId,
                    serviceId,
                    subServices,
                    addons,
                    bookingType: "recurring",
                    frequency,
                    customRecurrence,
                    startDateTime: bookingStart,
                    endDateTime: bookingEnd,
                    shippingAddress,
                    notes,
                    pricing,
                    recurringGroupId,
                    companyId
                });
            }

            // Move to next month, same day of week
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    } else if (frequency === "custom" && customRecurrence) {
        const { interval, unit, endDate: recurEndDate } = customRecurrence;
        let currentDate = new Date(start);
        const endDate = new Date(recurEndDate || start);

        while (currentDate <= endDate) {
            const bookingStart = new Date(currentDate);
            const bookingEnd = new Date(bookingStart.getTime() + bookingDuration);

            bookings.push({
                contactId,
                technicianId,
                serviceId,
                subServices,
                addons,
                bookingType: "recurring",
                frequency,
                customRecurrence,
                startDateTime: bookingStart,
                endDateTime: bookingEnd,
                shippingAddress,
                notes,
                pricing,
                recurringGroupId,
                companyId
            });

            // Increment based on unit
            if (unit === "days") {
                currentDate.setDate(currentDate.getDate() + interval);
            } else if (unit === "weeks") {
                currentDate.setDate(currentDate.getDate() + (interval * 7));
            } else if (unit === "months") {
                currentDate.setMonth(currentDate.getMonth() + interval);
            }
        }
    }

    return bookings;
}

// GET - Fetch bookings (for calendar display)
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const bookings = await Booking.find({ companyId: user.companyId })
            .populate('contactId', 'firstName lastName email')
            .populate('technicianId', 'firstName lastName')
            .populate('serviceId', 'name')
            .sort({ startDateTime: 1 });

        return NextResponse.json(bookings);
    } catch (error: any) {
        console.error("Error fetching bookings:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookings" },
            { status: 500 }
        );
    }
}
