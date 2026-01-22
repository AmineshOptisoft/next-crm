import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Service } from "@/app/models/Service";
import { getCurrentUser } from "@/lib/auth";
import { serviceAssetManager } from "@/lib/serviceAssetManager";
import { moveFileToServiceFolder } from "@/lib/moveFile";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (!user.companyId && user.role !== "super_admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
        name,
        description,
        logo,
        availability,
        percentage,
        priceType,
        basePrice,
        hourlyRate,
        status,
        parentId,
        subServices,
        category
    } = body;

    await connectDB();

    const service = await Service.findById(id);
    if (!service) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Check ownership
    if (user.role !== "super_admin" && service.companyId.toString() !== user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update all fields
    service.name = name || service.name;
    service.description = description !== undefined ? description : service.description;
    service.availability = availability || service.availability;
    service.percentage = percentage !== undefined ? percentage : service.percentage;
    service.priceType = priceType || service.priceType;
    service.basePrice = basePrice !== undefined ? basePrice : service.basePrice;
    service.hourlyRate = hourlyRate !== undefined ? hourlyRate : service.hourlyRate;
    service.status = status || service.status;
    service.parentId = parentId !== undefined ? parentId : service.parentId;
    service.subServices = subServices || service.subServices;
    service.category = category || service.category;

    // Handle logo update
    if (logo !== undefined && logo !== service.logo) {
        // New logo uploaded
        if (logo && logo.includes('/temp/')) {
            // Move from temp to service folder
            try {
                const newLogoUrl = await moveFileToServiceFolder(
                    logo,
                    service.companyId.toString(),
                    service._id.toString(),
                    'images'
                );
                service.logo = newLogoUrl;
            } catch (error) {
                console.error("Error moving logo file:", error);
                service.logo = logo; // Keep temp URL if move fails
            }
        } else {
            // External URL or already in correct location or empty string (removed)
            service.logo = logo;
        }
    }

    await service.save();

    return NextResponse.json(service);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (!user.companyId && user.role !== "super_admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const service = await Service.findById(id);
    if (!service) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Check ownership
    if (user.role !== "super_admin" && service.companyId.toString() !== user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete service folder and all assets
    try {
        await serviceAssetManager.deleteServiceFolder(
            service.companyId.toString(),
            service._id.toString()
        );
    } catch (error) {
        console.error("Error deleting service folder:", error);
        // Continue with service deletion even if folder deletion fails
    }

    await Service.findByIdAndDelete(id);

    return NextResponse.json({ message: "Service deleted successfully" });
}
