import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ServiceArea } from "@/app/models/ServiceArea";
import { ZipCode } from "@/app/models/ZipCode";
import { log } from "console";

// PUT - Update a service area
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const serviceArea = await ServiceArea.findOneAndUpdate(
            { _id: params.id, companyId: user.companyId },
            { name: name.trim() },
            { new: true, runValidators: true }
        );

        if (!serviceArea) {
            return NextResponse.json(
                { error: "Service area not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(serviceArea);
    } catch (error: any) {
        console.error("Error updating service area:", error);

        if (error.code === 11000) {
            return NextResponse.json(
                { error: "Service area with this name already exists" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to update service area" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a service area
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(id);
        const user = await getCurrentUser();
        console.log(user);
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Check if any zip codes for this company are using this service area
        const zipCodesCount = await ZipCode.countDocuments({
            serviceAreaId: id,
            companyId: user.companyId,
        });

        if (zipCodesCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete service area. ${zipCodesCount} zip code(s) are using it.` },
                { status: 400 }
            );
        }

        const serviceArea = await ServiceArea.findByIdAndDelete({
            _id: id,
            companyId: user.companyId,
        });

        if (!serviceArea) {
            return NextResponse.json(
                { error: "Service area not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Service area deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting service area:", error);
        return NextResponse.json(
            { error: "Failed to delete service area" },
            { status: 500 }
        );
    }
}
