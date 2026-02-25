import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json(
                { error: "Email parameter is required" },
                { status: 400 }
            );
        }

        // Check if a user with this email exists (only _id needed)
        const existingUser = await User.findOne({ email: email.toLowerCase() })
            .select("_id")
            .lean();

        return NextResponse.json({
            exists: !!existingUser,
            email: email
        });
    } catch (error: any) {
        console.error("Error checking email:", error);
        return NextResponse.json(
            { error: "Failed to check email availability" },
            { status: 500 }
        );
    }
}
