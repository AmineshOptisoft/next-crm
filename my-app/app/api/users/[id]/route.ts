import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const targetUser = await User.findOne({
    _id: id,
    companyId: user.companyId,
  })
    .populate("customRoleId", "name permissions")
    .select("-passwordHash -verificationToken")
    .lean();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(targetUser);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can update users" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  await connectDB();

  const targetUser = await User.findOne({
    _id: id,
    companyId: user.companyId,
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent changing company admin role
  if (targetUser.role === "company_admin" && body.role) {
    return NextResponse.json(
      { error: "Cannot change company admin role" },
      { status: 400 }
    );
  }

  // If password is being updated
  if (body.password) {
    body.passwordHash = await bcrypt.hash(body.password, 10);
    delete body.password;
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true }
  )
    .populate("customRoleId", "name permissions")
    .select("-passwordHash -verificationToken");

  return NextResponse.json(updatedUser);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can delete users" },
      { status: 403 }
    );
  }

  const { id } = await params;
  await connectDB();

  const targetUser = await User.findOne({
    _id: id,
    companyId: user.companyId,
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent deleting company admin
  if (targetUser.role === "company_admin") {
    return NextResponse.json(
      { error: "Cannot delete company admin" },
      { status: 400 }
    );
  }

  // Soft delete by setting isActive to false
  await User.findByIdAndUpdate(id, { isActive: false });

  return NextResponse.json({ message: "User deactivated successfully" });
}
