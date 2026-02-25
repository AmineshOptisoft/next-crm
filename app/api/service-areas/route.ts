import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ServiceArea } from "@/app/models/ServiceArea";

// GET - Fetch all service areas for the company
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const serviceAreas = await ServiceArea.find({
            companyId: user.companyId,
        }).sort({ name: 1 }).lean();

        return NextResponse.json(serviceAreas);
    } catch (error: any) {
        console.error("Error fetching service areas:", error);
        return NextResponse.json(
            { error: "Failed to fetch service areas" },
            { status: 500 }
        );
    }
}

// POST - Create a new service area
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { name } = body;

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: "Service area name is required" },
                { status: 400 }
            );
        }

        const serviceArea = await ServiceArea.create({
            companyId: user.companyId,
            name: name.trim(),
        });

        return NextResponse.json(serviceArea, { status: 201 });
    } catch (error: any) {
        console.error("Error creating service area:", error);

        // Handle duplicate name error
        if (error.code === 11000) {
            return NextResponse.json(
                { error: "Service area with this name already exists" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to create service area" },
            { status: 500 }
        );
    }
}
