import { NextRequest, NextResponse } from "next/server";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import { connectDB } from "@/lib/db";
import { Types } from "mongoose";
import { log } from "console";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid technician ID" }, { status: 400 });
        }

        const timeOffs = await TechnicianTimeOff.find({ 
            technicianId: new Types.ObjectId(id) 
        }).sort({ createdAt: -1 });

        return NextResponse.json(timeOffs);
    } catch (error) {
        console.error("Failed to fetch time offs:", error);
        return NextResponse.json({ error: "Failed to fetch time offs" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        

        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid technician ID" }, { status: 400 });
        }

        const body = await req.json();

        const { startDate, startTime, endDate, endTime, reason } = body;

        if (!startDate || !startTime || !endDate || !endTime || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
        }

        if (parsedEndDate <= parsedStartDate) {
            return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
        }

        const newTimeOff = await TechnicianTimeOff.create({
            technicianId: new Types.ObjectId(id),
            startDate: parsedStartDate,
            startTime,
            endDate: parsedEndDate,
            endTime,
            reason,
            status: body.status ?? "APPROVED",
            notes: body.notes ?? "",
        });

        return NextResponse.json(newTimeOff, { status: 201 });
    } catch (error: any) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e: any) => e.message);
            return NextResponse.json({ error: "Validation failed", details: messages }, { status: 400 });
        }

        console.error("Failed to create time off:", error);
        return NextResponse.json({ error: "Failed to create time off" }, { status: 500 });
    }
}