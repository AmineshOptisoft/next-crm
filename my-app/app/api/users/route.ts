import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can view users" },
      { status: 403 }
    );
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  await connectDB();

  const users = await User.find({
    companyId: user.companyId,
    isActive: true,
  })
    .populate("customRoleId", "name permissions")
    .select("-passwordHash -verificationToken")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can create users" },
      { status: 403 }
    );
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const body = await req.json();
  const { firstName, lastName, email, password, customRoleId } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  await connectDB();

  // Check if email already exists
  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    role: "company_user",
    companyId: user.companyId,
    customRoleId: customRoleId || null,
    isVerified: true, // Auto-verify company users
    isActive: true,
  });

  const userResponse = await User.findById(newUser._id)
    .populate("customRoleId", "name permissions")
    .select("-passwordHash -verificationToken")
    .lean();

  return NextResponse.json(userResponse, { status: 201 });
}
