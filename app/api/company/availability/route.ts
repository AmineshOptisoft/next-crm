import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";

// GET - Fetch master availability
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        let company = await Company.findById(user.companyId);
        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        // If masterAvailability doesn't exist or is empty, create default schedule
        if (!company.masterAvailability || company.masterAvailability.length === 0) {
            const defaultAvailability = getDefaultAvailability();
            company.masterAvailability = defaultAvailability;
            await company.save();
        }

        return NextResponse.json(company.masterAvailability);
    } catch (error: any) {
        console.error("Error fetching master availability:", error);
        return NextResponse.json(
            { error: "Failed to fetch master availability" },
            { status: 500 }
        );
    }
}

// PUT - Update master availability
export async function PUT(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { masterAvailability } = body;

        if (!Array.isArray(masterAvailability)) {
            return NextResponse.json(
                { error: "Invalid availability data" },
                { status: 400 }
            );
        }

        const company = await Company.findByIdAndUpdate(
            user.companyId,
            { masterAvailability },
            { new: true, runValidators: true }
        );

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        return NextResponse.json(company.masterAvailability);
    } catch (error: any) {
        console.error("Error updating master availability:", error);
        return NextResponse.json(
            { error: "Failed to update master availability" },
            { status: 500 }
        );
    }
}

// Default availability helper
function getDefaultAvailability() {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days.map(day => ({
        day,
        isOpen: day !== "Saturday" && day !== "Sunday",
        startTime: "09:00 AM",
        endTime: "06:00 PM"
    }));
}
