import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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

    // Ensure new password is not the same as the current one
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "please enter a new password" },
        { status: 400 }
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Password Reset][Confirm] Error:", error);
    return NextResponse.json(
      { error: "Unable to reset password. Please try again later." },
      { status: 500 }
    );
  }
}

