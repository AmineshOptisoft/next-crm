import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (
      !user ||
      !user.resetPasswordOtp ||
      !user.resetPasswordOtpExpires ||
      user.resetPasswordOtp !== otp ||
      user.resetPasswordOtpExpires < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Password Reset][Verify OTP] Error:", error);
    return NextResponse.json(
      { error: "Unable to verify OTP. Please try again later." },
      { status: 500 }
    );
  }
}

