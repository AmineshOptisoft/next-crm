import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ZipCode } from "@/app/models/ZipCode";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const deletedZipCode = await ZipCode.findOneAndDelete({
            _id: params.id,
            companyId: user.companyId,
        });

        if (!deletedZipCode) {
            return NextResponse.json({ error: "Zip Code not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Zip Code deleted successfully" });
    } catch (error) {
        console.error("Error deleting zip code:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
