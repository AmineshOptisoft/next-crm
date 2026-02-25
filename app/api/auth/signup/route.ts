import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";
import { Company } from "../../../models/Company";
import { sendTransactionalEmail } from "@/lib/sendmailhelper";
import { sendVerificationEmail } from "@/lib/mail";
import { signupSchema } from "@/app/(auth)/signup/schema";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplateHelper";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const parseResult = signupSchema.safeParse({
    ...body,
    confirmPassword: body.password,
  });

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, field: firstError.path[0] },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, password, companyName, countryId, stateId, cityId } =
    parseResult.data;

  // Check existing user
  const existing = await User.exists({ email });
  if (existing) {
    return NextResponse.json({ error: "Email already in use", field: "email" }, { status: 400 });
  }

  // Parallel: hash password + generate token
  const [passwordHash, token] = await Promise.all([
    bcrypt.hash(password, 10),
    Promise.resolve(crypto.randomBytes(32).toString("hex")),
  ]);

  const tokenExpires = new Date(Date.now() + 86_400_000); // 24 hours

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create user
    const [user] = await User.create(
      [
        {
          firstName,
          lastName,
          email,
          passwordHash,
          role: "company_admin",
          companyName,
          countryId,
          stateId,
          cityId,
          verificationToken: token,
          verificationTokenExpires: tokenExpires,
        },
      ],
      { session }
    );

    // Create company
    const [company] = await Company.create(
      [
        {
          name: companyName,
          adminId: user._id,
          email,
          address: { city: cityId, state: stateId, country: countryId },
        },
      ],
      { session }
    );

    // Link company to user
    user.companyId = company._id;
    await user.save({ session });

    await session.commitTransaction();

    const companyId = company._id.toString();

    // No DB entry for roles — static roles are returned by GET /api/roles only.

    // Post-commit work (verification emails) in background so it
    // doesn't block the HTTP response.
    (async () => {
      try {
        const emailResult = await sendTransactionalEmail(
          EMAIL_TEMPLATES.ACCOUNT_CONFIRMATION,
          user.email,
          {
            token,
            firstname: firstName,
            lastname: lastName,
            company_name: companyName,
          },
          companyId
        );

        if (!emailResult.sent) {
          console.warn("Template email failed, falling back to legacy");
          await sendVerificationEmail(user.email, token);
        }
      } catch (err) {
        console.error("Post-signup setup error:", err);
      }
    })();

    return NextResponse.json({
      message: "Company registered successfully. Check email to verify.",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}