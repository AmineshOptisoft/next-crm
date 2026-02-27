import { NextRequest, NextResponse } from "next/server";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        const query = TechnicianTimeOff.find(filter)
            .populate({
                path: "technicianId",
                select: "firstName lastName email avatarUrl companyId",
                // Super admins can see all companies; others are restricted to their own company
                ...(user.role !== "super_admin" && user.companyId
                    ? { match: { companyId: user.companyId } }
                    : {}),
            })
            .sort({ createdAt: -1 });

        const timeOffs = await query.lean();

        // For non-super admins, filter out any records where the technician
        // didn't match the company filter (populate match yields null)
        const scopedTimeOffs =
            user.role === "super_admin"
                ? timeOffs
                : timeOffs.filter((t: any) => t.technicianId);

        return NextResponse.json(scopedTimeOffs);
    } catch (error) {
        console.error("Failed to fetch all time offs:", error);
        return NextResponse.json({ error: "Failed to fetch time offs" }, { status: 500 });
    }
}
