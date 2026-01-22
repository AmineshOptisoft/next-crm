import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema } from "@/app/(auth)/login/schema";
import { z } from "zod";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0] as any;
    return NextResponse.json(
      { error: firstError.message, field: firstError.path[0] },
      { status: 400 }
    );
  }

  const { email, password } = parseResult.data;

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Temporarily disabled for testing
  // if (!user.isVerified) {
  //   return NextResponse.json(
  //     { error: "Please verify your email first" },
  //     { status: 403 }
  //   );
  // }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  const res = NextResponse.json({ message: "Logged in" });
  res.cookies.set("crm_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res;
}
