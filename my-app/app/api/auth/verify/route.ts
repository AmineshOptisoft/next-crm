import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";

export async function GET(req: NextRequest) {
  console.log("✅ VERIFY API ROUTE HIT"); // ← This WILL show if file exists

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    console.log("Verify params:", { token: token?.slice(0, 10), email });

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email, verificationToken: token });

    if (!user) {
      console.log("❌ User not found:", email);
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    if (
      !user.verificationTokenExpires ||
      user.verificationTokenExpires < new Date()
    ) {
      console.log("❌ Token expired:", email);
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    console.log("✅ User verified:", email);
    return NextResponse.json({ message: "Account verified" });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
