import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { companyId, email, password } = body || {};

    if (!companyId || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      companyId,
      email,
      role: "contact",
    })
      .select("_id passwordHash")
      .lean();

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: user._id }, { status: 200 });
  } catch (error: any) {
    console.error("Error in public contact login:", error);
    return NextResponse.json(
      { error: "Failed to verify contact" },
      { status: 500 }
    );
  }
}

