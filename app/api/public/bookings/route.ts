import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import mongoose from "mongoose";

function generateOrderId() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      companyId,
      contactId,
      technicianId,
      serviceId,
      subServices = [],
      addons = [],
      startDateTime,
      endDateTime,
      notes,
      hasPets,
      pets = [],
      pricing,
      zipCode,
    } = body || {};

    if (
      !companyId ||
      !contactId ||
      !technicianId ||
      !serviceId ||
      !startDateTime ||
      !endDateTime
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { error: "Invalid start or end time" },
        { status: 400 }
      );
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const bookingDayStart = new Date(start);
    bookingDayStart.setHours(0, 0, 0, 0);
    if (bookingDayStart < todayStart) {
      return NextResponse.json(
        { error: "Booking date cannot be before today" },
        { status: 400 }
      );
    }
    const technicianObjId = new mongoose.Types.ObjectId(technicianId);
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    // Prevent overlap with existing technician bookings.
    const overlappingBooking = await Booking.findOne({
      companyId: companyObjId,
      technicianId: technicianObjId,
      status: {
        $nin: ["cancelled", "rejected", "deleted", "no_show"],
      },
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    })
      .select("_id")
      .lean();
    if (overlappingBooking) {
      return NextResponse.json(
        { error: "Technician is not available at this time. Select different time." },
        { status: 400 }
      );
    }

    // Prevent booking if an approved time-off overlaps the selected slot.
    const overlappingTimeOff = await TechnicianTimeOff.findOne({
      technicianId: technicianObjId,
      status: "APPROVED",
      startDate: { $lte: end },
      endDate: { $gte: start },
    })
      .select("_id")
      .lean();
    if (overlappingTimeOff) {
      return NextResponse.json(
        { error: "Technician is not available at this time. Select different time." },
        { status: 400 }
      );
    }

    const booking = await Booking.create({
      orderId: generateOrderId(),
      contactId: new mongoose.Types.ObjectId(contactId),
      technicianId: technicianObjId,
      serviceId: new mongoose.Types.ObjectId(serviceId),
      subServices,
      addons,
      bookingType: "once",
      startDateTime: start,
      endDateTime: end,
      shippingAddress: zipCode ? { zipCode } : undefined,
      notes,
      hasPets: typeof hasPets === "boolean" ? hasPets : undefined,
      pets: Array.isArray(pets) ? pets.filter((p: any) => typeof p === "string") : [],
      pricing,
      companyId: companyObjId,
      status: "unconfirmed",
    });

    return NextResponse.json({ id: booking._id }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating public booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

