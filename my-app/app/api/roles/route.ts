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
  const filter = { ...buildCompanyFilter(user), isActive: true };
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
  const { name, description, permissions } = body;

  if (!name || !permissions) {
    return NextResponse.json(
      { error: "Name and permissions are required" },
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

  const role = await Role.create({
    companyId: user.companyId,
    name,
    description,
    permissions,
    createdBy: user.userId,
    isSystemRole: false,
  });

  return NextResponse.json(role, { status: 201 });
}
