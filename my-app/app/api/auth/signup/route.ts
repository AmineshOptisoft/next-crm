import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/mail";
import { signupSchema } from "@/app/(auth)/signup/schema";

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

  const passwordHash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    companyName,
    countryId,
    stateId,
    cityId,
    verificationToken: token,
    verificationTokenExpires: tokenExpires,
  });

  await sendVerificationEmail(user.email, token);

  return NextResponse.json({ message: "Registered. Check email to verify." });
}
