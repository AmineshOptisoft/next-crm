import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { ZipCode } from "@/app/models/ZipCode";
import { getCurrentUser } from "@/lib/auth";

import { checkAndUpdateCompanyProfileCompletion } from "@/lib/companyCompletion";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        await connectDB();

        const deletedZipCode = await ZipCode.findOneAndDelete({
            _id: resolvedParams.id,
            companyId: user.companyId,
        });

        if (!deletedZipCode) {
            return NextResponse.json({ error: "Zip Code not found" }, { status: 404 });
        }

        await checkAndUpdateCompanyProfileCompletion(user.companyId);

        return NextResponse.json({ message: "Zip Code deleted successfully" });
    } catch (error) {
        console.error("Error deleting zip code:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
