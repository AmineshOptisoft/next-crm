import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";
import { User } from "@/app/models/User";
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
  /* 
     Restoring DB connection and checks.
  */
  const body = await req.json();
  await connectDB();

  const role = await Role.findOne({
    _id: id,
    companyId: user.companyId,
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Editing shared Substitute Technician creates a company-specific copy
  // so global default isn't changed for every company.
  if (role.isSystemRole) {
    if (role.name !== "Substitute Technician") {
      return NextResponse.json(
        { error: "Cannot edit system roles" },
        { status: 400 }
      );
    }

    const clonedName = (body.name || role.name || "").trim();
    if (!clonedName) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    const existingName = await Role.findOne({
      companyId: user.companyId,
      name: clonedName,
      isActive: true,
      isSystemRole: false,
    })
      .select("_id")
      .lean();

    if (existingName) {
      return NextResponse.json(
        { error: "Role with this name already exists in your company" },
        { status: 400 }
      );
    }

    const clonedRole = await Role.create({
      companyId: user.companyId,
      name: clonedName,
      description: body.description ?? role.description ?? "",
      permissions: body.permissions ?? role.permissions ?? [],
      createdBy: user.userId,
      isSystemRole: false,
      isDefaultRole: false,
      isActive: true,
    });

    // Re-point this company's users assigned to the shared role,
    // so this edit behaves like a company-local customization.
    await User.updateMany(
      { companyId: user.companyId, customRoleId: role._id },
      { $set: { customRoleId: clonedRole._id, defaultRoleName: null } }
    );

    return NextResponse.json(clonedRole, { status: 201 });
  }

  // Prepare update data
  const updateData = {
    ...body,
    // Hierarchy fields removed
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
