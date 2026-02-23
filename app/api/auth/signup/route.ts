import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";
import { Company } from "../../../models/Company";
import { createDefaultRoles } from "../../../models/Role";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/mail";
import { signupSchema } from "@/app/(auth)/signup/schema";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplateHelper";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const parseResult = signupSchema.safeParse({
    ...body,
    confirmPassword: body.password, // backend does not need confirm; just bypass
  });

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, field: firstError.path[0] },
      { status: 400 }
    );
  }

  const {
    firstName,
    lastName,
    email,
    password,
    companyName,
    countryId,
    stateId,
    cityId,
  } = parseResult.data;

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 400 }
    );
  }

  if (!companyName) {
    return NextResponse.json(
      { error: "Company name is required" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  try {
    // Create user first (as company_admin)
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role: "company_admin", // Set as company admin
      companyName,
      countryId,
      stateId,
      cityId,
      verificationToken: token,
      verificationTokenExpires: tokenExpires,
    });

    // Create company
    const company = await Company.create({
      name: companyName,
      adminId: user._id,
      email: email,
      address: {
        city: cityId,
        state: stateId,
        country: countryId,
      },
    });

    // Update user with companyId
    await User.findByIdAndUpdate(user._id, {
      companyId: company._id,
    });

    // Create default roles for the company
    await createDefaultRoles(company._id.toString(), user._id.toString());

    // Create default active email campaigns for the company so emails actually send
    const { seedDefaultEmailCampaigns } = await import("@/lib/seedEmailCampaigns");
    await seedDefaultEmailCampaigns(company._id.toString(), user._id.toString());

    // Try to send via template system first
    const { sendTransactionalEmail } = await import("@/lib/sendmailhelper");
    const emailResult = await sendTransactionalEmail(
        EMAIL_TEMPLATES.ACCOUNT_CONFIRMATION,
        user.email,
        { 
            token, 
            firstname: user.firstName,
            lastname: user.lastName,
            company_name: companyName 
        },
        company._id.toString()
    );

    if (!emailResult.sent) {
        console.log("Template email failed, falling back to legacy verification email");
        try {
            await sendVerificationEmail(user.email, token);
        } catch (mailErr) {
            console.error("Legacy verification email also failed:", mailErr);
            // It's non-fatal since the user/company already got created in the DB!
        }
    }

    return NextResponse.json({
      message: "Company registered successfully. Check email to verify.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
