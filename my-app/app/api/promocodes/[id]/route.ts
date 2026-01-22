import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Promocode } from "@/app/models/Promocode";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const resolvedParams = await params;
        const deletedToken = await Promocode.findOneAndDelete({
            _id: resolvedParams.id,
            companyId: user.companyId, // Ensure ownership
        });

        if (!deletedToken) {
            return NextResponse.json({ error: "Promocode not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Promocode deleted successfully" });
    } catch (error) {
        console.error("Error deleting promocode:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
