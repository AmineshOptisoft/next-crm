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
  const companyFilter = buildCompanyFilter(user);
  const getDefaultRoles = await Role.find({
    isDefaultRole: true,
    isSystemRole: true,
  }).populate("createdBy", "firstName lastName email")
    .populate("companyId", "name")
    .lean();

  const url = new URL(req.url);
  const creatorFilter = url.searchParams.get("creator");

  const filter: any = { ...companyFilter, isActive: true };
  if (creatorFilter === "me") {
    filter.createdBy = user.userId;
  }

  let dbRoles = await Role.find(filter)
    .populate("createdBy", "firstName lastName email")
    .populate("companyId", "name")
    .sort({ isDefaultRole: -1, createdAt: -1 })
    .lean();

  const defaultIds = new Set((getDefaultRoles as any[]).map((r: any) => r._id.toString()));
  const otherRoles = (dbRoles as any[]).filter((r: any) => !defaultIds.has(r._id.toString()));

  let roles = [...getDefaultRoles, ...otherRoles];

  if (user.role === "super_admin") {
    const seenSystemRoles = new Set<string>();
    roles = roles.filter((role: any) => {
      if (role.isSystemRole) {
        if (seenSystemRoles.has(role.name)) {
          return false;
        }
        seenSystemRoles.add(role.name);
      }
      return true;
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

  // Check if role name already exists in this company (only _id needed)
  const existing = await Role.findOne({
    companyId: user.companyId,
    name: name,
  })
    .select("_id")
    .lean();

  if (existing) {
    return NextResponse.json(
      { error: "Role with this name already exists" },
      { status: 400 }
    );
  }

  const roleData = {
    companyId: user.companyId,
    name,
    description,
    permissions,
    createdBy: user.userId,
    isSystemRole: false,
    isDefaultRole: false,
  };

  const role = await Role.create(roleData);

  return NextResponse.json(role, { status: 201 });
}
