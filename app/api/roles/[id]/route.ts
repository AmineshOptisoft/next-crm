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
  const { hasParent, isParent, parentRoleId } = body;

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

  // Determine standard values (prioritize isParent if sent, otherwise fallback to hasParent logic)
  const finalIsParent = isParent !== undefined ? isParent : (hasParent ? 0 : 1);
  const finalParentId = (finalIsParent === 0 && parentRoleId) ? parentRoleId : null;

  // Validate parent role if it's a child role
  if (finalIsParent === 0 && !finalParentId) {
    return NextResponse.json(
      { error: "Parent role is required for child roles" },
      { status: 400 }
    );
  }

  // Validate parent role exists and is a parent role (isParent = 1)
  if (finalIsParent === 0 && finalParentId) {
    // Prevent circular reference
    if (finalParentId === id) {
      return NextResponse.json(
        { error: "A role cannot be its own parent" },
        { status: 400 }
      );
    }

    const parentRole = await Role.findById(finalParentId);
    if (!parentRole) {
      return NextResponse.json(
        { error: "Selected parent role does not exist" },
        { status: 400 }
      );
    }
    
    // Check if the parent role is a parent role (isParent = 1 or undefined for old roles)
    const parentIsParent = parentRole.isParent !== undefined ? parentRole.isParent : 1;
    
    if (parentIsParent !== 1) {
      return NextResponse.json(
        { error: "Selected role is not a parent role" },
        { status: 400 }
      );
    }
  }

  // Prepare update data
  const updateData = {
    ...body,
    isParent: finalIsParent,
    parentRoleId: finalParentId,
  };

  const updatedRole = await Role.findByIdAndUpdate(
    id,
    { $set: updateData },
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
