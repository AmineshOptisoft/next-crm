import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";

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

  const role = await Role.findOne({
    _id: id,
    companyId: user.companyId,
  })
    .populate("createdBy", "firstName lastName email")
    .lean();

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  return NextResponse.json(role);
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
      { error: "Only company admins can update roles" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  await connectDB();

  const role = await Role.findOne({
    _id: id,
    companyId: user.companyId,
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Prevent editing system roles
  if (role.isSystemRole) {
    return NextResponse.json(
      { error: "Cannot edit system roles" },
      { status: 400 }
    );
  }

  const updatedRole = await Role.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true }
  );

  return NextResponse.json(updatedRole);
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
      { error: "Only company admins can delete roles" },
      { status: 403 }
    );
  }

  const { id } = await params;
  await connectDB();

  const role = await Role.findOne({
    _id: id,
    companyId: user.companyId,
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Prevent deleting system roles
  if (role.isSystemRole) {
    return NextResponse.json(
      { error: "Cannot delete system roles" },
      { status: 400 }
    );
  }

  // Soft delete by setting isActive to false
  await Role.findByIdAndUpdate(id, { isActive: false });

  return NextResponse.json({ message: "Role deleted successfully" });
}
