import { NextRequest, NextResponse } from "next/server";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import { connectDB } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const technicianId = searchParams.get("technicianId");

        const filter: Record<string, any> = {};
        if (status && status !== "all") {
            filter.status = status.toUpperCase();
        }
        if (technicianId) {
            const { Types } = await import("mongoose");
            if (Types.ObjectId.isValid(technicianId)) {
                filter.technicianId = technicianId;
            }
        }

        const timeOffs = await TechnicianTimeOff.find(filter)
            .populate("technicianId", "firstName lastName email avatarUrl")
            .sort({ createdAt: -1 });

        return NextResponse.json(timeOffs);
    } catch (error) {
        console.error("Failed to fetch all time offs:", error);
        return NextResponse.json({ error: "Failed to fetch time offs" }, { status: 500 });
    }
}
