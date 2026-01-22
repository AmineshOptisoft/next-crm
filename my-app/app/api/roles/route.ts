import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can view roles" },
      { status: 403 }
    );
  }

  await connectDB();

  // Build filter: super admins see all roles, company admins see only their company's roles
  const url = new URL(req.url);
  const creatorFilter = url.searchParams.get("creator");

  const filter: any = { ...buildCompanyFilter(user), isActive: true };
  if (creatorFilter === "me") {
    filter.createdBy = user.userId;
  }
  let roles = await Role.find(filter)
    .populate("createdBy", "firstName lastName email")
    .populate("companyId", "name")
    .sort({ createdAt: -1 })
    .lean();

  // For super admins, deduplicate system roles (show only one instance of each system role)
  if (user.role === "super_admin") {
    const seenSystemRoles = new Set<string>();
    roles = roles.filter((role: any) => {
      if (role.isSystemRole) {
        if (seenSystemRoles.has(role.name)) {
          return false; // Skip duplicate system role
        }
        seenSystemRoles.add(role.name);
      }
      return true; // Keep custom roles and first instance of system roles
    });
  }

  // Ensure isParent and parentRoleId fields exist (for backward compatibility)
  roles = roles.map((role: any) => ({
    ...role,
    isParent: role.isParent !== undefined ? role.isParent : 1,
    parentRoleId: role.parentRoleId || null,
  }));

  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can create roles" },
      { status: 403 }
    );
  }

  // Validate user has company access
  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const body = await req.json();
  const { name, description, permissions, hasParent, isParent, parentRoleId } = body;

  if (!name || !permissions) {
    return NextResponse.json(
      { error: "Name and permissions are required" },
      { status: 400 }
    );
  }

  // Determine standard values (prioritize isParent if sent, otherwise fallback to hasParent logic)
  // Logic: If isParent is 0, it means it's a child.
  const finalIsParent = isParent !== undefined ? isParent : (hasParent ? 0 : 1);
  const finalParentId = (finalIsParent === 0 && parentRoleId) ? parentRoleId : null;

  // Validate parent role if it's a child role
  if (finalIsParent === 0 && !finalParentId) {
    return NextResponse.json(
      { error: "Parent role is required for child roles" },
      { status: 400 }
    );
  }

  await connectDB();

  // Check if role name already exists in this company
  const existing = await Role.findOne({
    companyId: user.companyId,
    name: name,
  });

  if (existing) {
    return NextResponse.json(
      { error: "Role with this name already exists" },
      { status: 400 }
    );
  }

  // Validate parent role exists and is a parent role (isParent = 1)
  if (finalIsParent === 0 && finalParentId) {
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
        { error: `Selected role is not a parent role (isParent=${parentRole.isParent})` },
        { status: 400 }
      );
    }
  }

  const roleData = {
    companyId: user.companyId,
    name,
    description,
    permissions,
    createdBy: user.userId,
    isSystemRole: false,
    isParent: finalIsParent,
    parentRoleId: finalParentId,
  };


  const role = await Role.create(roleData);

  return NextResponse.json(role, { status: 201 });
}
