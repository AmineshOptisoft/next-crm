import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getZipCodesForLocation } from "@/lib/ai/zip-codes";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const location = searchParams.get("location")?.trim() ?? "";

        if (!location) {
            return NextResponse.json({ error: "Location is required" }, { status: 400 });
        }

        const zipCodes = await getZipCodesForLocation(location);
        return NextResponse.json({ zipCodes });
    } catch (error) {
        console.error("Error previewing zip codes:", error);
        return NextResponse.json({ error: "Failed to fetch zip codes" }, { status: 500 });
    }
}
