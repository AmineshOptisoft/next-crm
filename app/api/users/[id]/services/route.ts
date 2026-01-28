import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Service } from "@/app/models/Service";
import { User } from "@/app/models/User";

// GET - Fetch technician's assigned services with hierarchy
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

        // Fetch technician to get their assigned services
        const technician = await User.findById(technicianId).select('services');

        if (!technician) {
            return NextResponse.json({ error: "Technician not found" }, { status: 404 });
        }

        // Fetch all main services assigned to this technician
        const mainServices = await Service.find({
            _id: { $in: technician.services || [] },
            category: "main",
            status: "active",
            companyId: user.companyId
        }).lean();

        // For each main service, fetch its sub-services and addons
        const servicesWithHierarchy = await Promise.all(
            mainServices.map(async (mainService) => {
                const subServices = await Service.find({
                    parentId: mainService._id,
                    category: "sub",
                    status: "active"
                }).lean();

                const addons = await Service.find({
                    parentId: mainService._id,
                    category: "addon",
                    status: "active"
                }).lean();

                return {
                    ...mainService,
                    subServices,
                    addons
                };
            })
        );

        return NextResponse.json(servicesWithHierarchy);
    } catch (error: any) {
        console.error("Error fetching technician services:", error);
        return NextResponse.json(
            { error: "Failed to fetch services" },
            { status: 500 }
        );
    }
}
