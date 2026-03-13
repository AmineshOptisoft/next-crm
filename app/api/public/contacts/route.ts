import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      companyId,
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      smsOptIn,
    } = body || {};

    if (!companyId || !email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role: "contact",
      companyId,
      phoneNumber: phone,
      address,
      city,
      state,
      zipCode,
      contactStatus: "new lead",
      smsStatus: Boolean(smsOptIn),
    });

    return NextResponse.json({ id: user._id }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating public contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}

