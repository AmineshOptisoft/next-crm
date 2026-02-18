import { NextRequest, NextResponse } from "next/server";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import { connectDB } from "@/lib/db";

import { Types } from "mongoose";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const deletedTimeOff = await TechnicianTimeOff.findByIdAndDelete(id);

        if (!deletedTimeOff) {
            return NextResponse.json({ error: "Time off not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Time off deleted successfully" });
    } catch (error) {
        console.error("Failed to delete time off:", error);
        return NextResponse.json({ error: "Failed to delete time off" }, { status: 500 });
    }
}
