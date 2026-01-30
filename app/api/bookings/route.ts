import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { Service } from "@/app/models/Service";
import { User } from "@/app/models/User";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Helper to generate unique Order ID
function generateOrderId() {
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

// POST - Create booking(s)
// POST - Create booking(s)
export async function POST(req: NextRequest) {
    let session;
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        session = await mongoose.startSession();
        session.startTransaction();

        const body = await req.json();
        const {
            newContact, // Optional: New contact details
            contactId: existingContactId,
            technicianId,
            technicianIds = [],
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

        // --- 1. Handle Contact Creation (if needed) ---
        let finalContactId = existingContactId;

        if (newContact) {
            // Check if email already exists
            const existingUser = await User.findOne({ email: newContact.email }).session(session);
            if (existingUser) {
                await session.abortTransaction();
                session.endSession();
                return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
            }

            // Create new contact
            const createdContact = await User.create([{
                firstName: newContact.firstName,
                lastName: newContact.lastName,
                email: newContact.email,
                passwordHash: await bcrypt.hash(newContact.password, 10), // Hash password
                phoneNumber: newContact.phone,
                role: "contact",
                companyId: user.companyId,
                address: newContact.streetAddress, // Assuming mapped from form
                city: newContact.city,
                state: newContact.state,
                zipCode: newContact.zipCode,
                contactStatus: "new lead",
                ownerId: user.userId,
                // Add any other mapped fields here
            }], { session });

            finalContactId = createdContact[0]._id;
        }

        // --- 2. Determines Technicians ---
        let techIdsToProcess: string[] = [];
        if (technicianIds && technicianIds.length > 0) {
            techIdsToProcess = technicianIds;
        } else if (technicianId) {
            techIdsToProcess = [technicianId];
        }

        // Validate required fields
        if (!finalContactId || techIdsToProcess.length === 0 || !serviceId || !startDateTime || !endDateTime) {
            await session.abortTransaction();
            session.endSession();
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Generate a unique Group ID
        const bookingGroupId = uuidv4();
        let allCreatedBookings: any[] = [];

        // Loop through each technician and create bookings
        for (const techId of techIdsToProcess) {
            if (bookingType === "once") {
                const booking = await Booking.create([{
                    contactId: finalContactId,
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
                    orderId: generateOrderId(),
                    recurringGroupId: bookingGroupId,
                    companyId: user.companyId,
                    status: "unconfirmed"
                }], { session });
                allCreatedBookings.push(booking[0]);
            }
            else if (bookingType === "recurring") {
                const bookingsData = generateRecurringBookings({
                    contactId: finalContactId,
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
                    recurringGroupId: bookingGroupId,
                    companyId: user.companyId
                });

                const created = await Booking.insertMany(bookingsData, { session });
                allCreatedBookings.push(...created);
            }
        }

        await session.commitTransaction();
        session.endSession();

        return NextResponse.json({
            message: `Created ${allCreatedBookings.length} bookings for ${techIdsToProcess.length} technicians`,
            count: allCreatedBookings.length,
            bookingGroupId: bookingGroupId,
            bookings: allCreatedBookings
        }, { status: 201 });

    } catch (error: any) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error("Error creating booking:", error);
        return NextResponse.json(
            { error: "Failed to create booking", details: error.message },
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
                    orderId: generateOrderId(),
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
                    orderId: generateOrderId(),
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
                orderId: generateOrderId(),
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
