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
        // Only return codes that are active AND not yet expired
        const now = new Date();
        const promocodes = await Promocode.find({
            companyId: user.companyId,
            isActive: true,
            expiryDate: { $gt: now },
        }).sort({ createdAt: -1 }).lean();

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

        // Check uniqueness (only _id needed)
        const existing = await Promocode.findOne({
            companyId: user.companyId,
            code: code.toUpperCase()
        }).select("_id").lean();

        if (existing) {
            return NextResponse.json({ error: "Promocode already exists" }, { status: 400 });
        }

        const limitNum = limit === "" || limit === undefined || limit === null ? -1 : Number(limit);
        const promocode = await Promocode.create({
            companyId: user.companyId,
            code,
            type,
            value: Number(value),
            limit: limitNum,
            expiryDate: new Date(expiryDate),
        });

        return NextResponse.json(promocode, { status: 201 });
    } catch (error) {
        console.error("Error creating promocode:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
