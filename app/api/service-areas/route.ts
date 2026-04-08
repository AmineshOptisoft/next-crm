import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ServiceArea } from "@/app/models/ServiceArea";
import { ZipCode } from "@/app/models/ZipCode";

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
        const { name, zipCodes } = body;

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: "Service area name is required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(zipCodes) || zipCodes.length === 0) {
            return NextResponse.json(
                { error: "Please select at least one zip code for this service area" },
                { status: 400 }
            );
        }

        const cleanedZipCodes = Array.from(
            new Set(
                zipCodes
                    .map((item: unknown) => String(item ?? "").trim())
                    .filter((item: string) => Boolean(item))
            )
        );

        if (cleanedZipCodes.length === 0) {
            return NextResponse.json(
                { error: "Please select valid zip code(s)" },
                { status: 400 }
            );
        }

        const serviceArea = await ServiceArea.create({
            companyId: user.companyId,
            name: name.trim(),
        });

        const zipWriteResult = await ZipCode.bulkWrite(
            cleanedZipCodes.map((code) => ({
                updateOne: {
                    filter: {
                        companyId: user.companyId,
                        code,
                    },
                    update: {
                        $set: {
                            companyId: user.companyId,
                            serviceAreaId: serviceArea._id,
                            code,
                        },
                    },
                    upsert: true,
                },
            }))
        );

        const totalSavedZipCodes =
            (zipWriteResult.upsertedCount ?? 0) + (zipWriteResult.modifiedCount ?? 0);

        return NextResponse.json(
            {
                serviceArea,
                selectedZipCodes: cleanedZipCodes,
                totalSavedZipCodes,
            },
            { status: 201 }
        );
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
