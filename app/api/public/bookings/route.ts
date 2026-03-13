import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
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

    const booking = await Booking.create({
      orderId: generateOrderId(),
      contactId: new mongoose.Types.ObjectId(contactId),
      technicianId: new mongoose.Types.ObjectId(technicianId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
      subServices,
      addons,
      bookingType: "once",
      startDateTime: start,
      endDateTime: end,
      shippingAddress: zipCode ? { zipCode } : undefined,
      notes,
      pricing,
      companyId: new mongoose.Types.ObjectId(companyId),
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

