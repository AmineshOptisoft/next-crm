import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Service } from "@/app/models/Service";
import { User } from "@/app/models/User";

// GET - Fetch technician's assigned services with hierarchy (optimized: 3 queries instead of N+1)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { id: technicianId } = await params;

        const technician = await User.findById(technicianId).select("services").lean();
        if (!technician) {
            return NextResponse.json({ error: "Technician not found" }, { status: 404 });
        }

        const serviceIds = (technician as any).services || [];
        if (serviceIds.length === 0) {
            return NextResponse.json([]);
        }

        // 1. All main services for this technician in one query
        const mainServices = await Service.find({
            _id: { $in: serviceIds },
            category: "main",
            status: "active",
            companyId: user.companyId,
        })
            .select("_id name description availability percentage priceType basePrice hourlyRate status category estimatedTime")
            .lean();

        const mainIds = mainServices.map((s: any) => s._id);

        if (mainIds.length === 0) {
            return NextResponse.json([]);
        }

        // 2. All sub + addon services for these mains in one query (no N+1)
        const children = await Service.find({
            parentId: { $in: mainIds },
            category: { $in: ["sub", "addon"] },
            status: "active",
            companyId: user.companyId,
        })
            .select("_id name description availability percentage priceType basePrice hourlyRate status category estimatedTime parentId companyId")
            .lean();

        const byParent: Record<string, { sub: any[]; addon: any[] }> = {};
        for (const id of mainIds) {
            byParent[id.toString()] = { sub: [], addon: [] };
        }
        for (const c of children as any[]) {
            const pid = c.parentId?.toString();
            if (!pid || !byParent[pid]) continue;
            if (c.category === "sub") byParent[pid].sub.push(c);
            else if (c.category === "addon") byParent[pid].addon.push(c);
        }

        const servicesWithHierarchy = mainServices.map((main: any) => ({
            ...main,
            subServices: byParent[main._id.toString()]?.sub ?? [],
            addons: byParent[main._id.toString()]?.addon ?? [],
        }));

        return NextResponse.json(servicesWithHierarchy);
    } catch (error: any) {
        console.error("Error fetching technician services:", error);
        return NextResponse.json(
            { error: "Failed to fetch services" },
            { status: 500 }
        );
    }
}
