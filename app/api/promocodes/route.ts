import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Promocode } from "@/app/models/Promocode";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const promocodes = await Promocode.find({ companyId: user.companyId }).sort({ createdAt: -1 });

        return NextResponse.json(promocodes);
    } catch (error) {
        console.error("Error fetching promocodes:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { code, type, value, limit, expiryDate } = body;

        // Basic validation
        if (!code || !type || !value || !expiryDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Check uniqueness
        const existing = await Promocode.findOne({
            companyId: user.companyId,
            code: code.toUpperCase()
        });

        if (existing) {
            return NextResponse.json({ error: "Promocode already exists" }, { status: 400 });
        }

        const promocode = await Promocode.create({
            companyId: user.companyId,
            code,
            type,
            value: Number(value),
            limit: Number(limit),
            expiryDate: new Date(expiryDate),
        });

        return NextResponse.json(promocode, { status: 201 });
    } catch (error) {
        console.error("Error creating promocode:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
