import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ZipCode } from "@/app/models/ZipCode";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const zipCodes = await ZipCode.find({ companyId: user.companyId })
            .populate('serviceAreaId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(zipCodes);
    } catch (error) {
        console.error("Error fetching zip codes:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { serviceAreaId, code } = await req.json();

        if (!serviceAreaId || !code) {
            return NextResponse.json({ error: "Service area and Zip code are required" }, { status: 400 });
        }

        await connectDB();

        // Check for duplicate zip code in the company (only _id needed)
        const existing = await ZipCode.findOne({ companyId: user.companyId, code })
            .select("_id").lean();
        if (existing) {
            return NextResponse.json({ error: "This Zip Code already exists in your company." }, { status: 400 });
        }

        const newZipCode = await ZipCode.create({
            companyId: user.companyId,
            serviceAreaId,
            code,
        });

        // Populate service area name before returning
        await newZipCode.populate('serviceAreaId', 'name');

        return NextResponse.json(newZipCode, { status: 201 });
    } catch (error) {
        console.error("Error creating zip code:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
