import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Service } from "@/app/models/Service";
import { getCurrentUser } from "@/lib/auth";
import { serviceAssetManager } from "@/lib/serviceAssetManager";
import { moveFileToServiceFolder } from "@/lib/moveFile";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || (!user.companyId && user.role !== "super_admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let query: any = {};
    if (user.role !== "super_admin") {
        query.companyId = user.companyId;
    }

    const services = await Service.find(query).sort({ createdAt: -1 });

    return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
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
        subServices
    } = body;

    if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await connectDB();

    // Determine companyId
    let targetCompanyId = user.companyId;
    if (user.role === "super_admin" && body.companyId) {
        targetCompanyId = body.companyId;
    }

    if (!targetCompanyId) {
        return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const service = await Service.create({
        companyId: targetCompanyId,
        name,
        description,
        logo: "", // Will be updated after moving file
        availability: availability || "both",
        percentage: percentage || 0,
        priceType: priceType || "fixed",
        basePrice: basePrice || 0,
        hourlyRate: hourlyRate || 0,
        status: status || "active",
        parentId: parentId || null,
        subServices: subServices || []
    });

    // Create folder structure for service assets
    try {
        await serviceAssetManager.createServiceFolder(
            targetCompanyId.toString(),
            service._id.toString()
        );
    } catch (error) {
        console.error("Error creating service folder:", error);
        // Don't fail service creation if folder creation fails
    }

    // Move logo from temp to service folder if provided
    let finalLogoUrl = logo;
    if (logo && logo.includes('/temp/')) {
        try {
            finalLogoUrl = await moveFileToServiceFolder(
                logo,
                targetCompanyId.toString(),
                service._id.toString(),
                'images'
            );
            // Update service with new logo URL
            service.logo = finalLogoUrl;
            await service.save();
        } catch (error) {
            console.error("Error moving logo file:", error);
            // Keep temp URL if move fails
            service.logo = logo;
            await service.save();
        }
    } else if (logo) {
        // Logo already in correct location or external URL
        service.logo = logo;
        await service.save();
    }

    return NextResponse.json(service, { status: 201 });
}
