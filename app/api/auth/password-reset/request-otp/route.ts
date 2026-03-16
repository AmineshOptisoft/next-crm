import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import EmailCampaign from "@/app/models/EmailCampaign";
import { personalizeEmail, sendMailWithEnvProvider } from "@/lib/mail";

// Name of the default email campaign used for reset OTP
const RESET_OTP_CAMPAIGN_NAME = "Reset Password OTP";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal whether user exists
      return NextResponse.json({ ok: true });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const validityMinutes = 10;
    const expires = new Date(Date.now() + validityMinutes * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expires;
    await user.save();

    // Load default "Reset Password OTP" email campaign
    const campaign = await EmailCampaign.findOne({
      name: RESET_OTP_CAMPAIGN_NAME,
      isDefault: true,
      status: "active",
    }).sort({ updatedAt: -1 });

    if (!campaign || !campaign.html) {
      console.warn(
        "[Reset Password OTP] No active default campaign found; skipping email send"
      );
      return NextResponse.json({ ok: true, warning: "NO_TEMPLATE" });
    }

    const htmlTemplate: string = (campaign as any).html;
    const subjectTemplate: string =
      (campaign as any).subject || "Your password reset OTP";

    const userLike = {
      email: user.email,
      firstName: (user as any).firstName || "",
      lastName: (user as any).lastName || "",
      companyName: (user as any).companyName || "",
    };

    const expiryLabel = `${validityMinutes} minutes`;

    const data = {
      otp,
      OTP_CODE: otp,
      EXPIRY_TIME: expiryLabel,
    };

    const html = personalizeEmail(htmlTemplate, userLike, data);
    const subject = personalizeEmail(subjectTemplate, userLike, data);

    // Send via default SMTP provider from .env, not company SMTP
    await sendMailWithEnvProvider({
      to: user.email,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Password Reset][Request OTP] Error:", error);
    return NextResponse.json(
      { error: "Unable to send OTP. Please try again later." },
      { status: 500 }
    );
  }
}

