import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";
import mongoose from "mongoose";

const SHARED_SUBSTITUTE_TECHNICIAN_ROLE = {
  name: "Substitute Technician",
  description: "If no technician is available, this role can be used as a fallback assignment.",
  permissions: [
    { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "contacts", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "deals", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "activities", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "meetings", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "tasks", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "products", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "appointments", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "bookings", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
    { module: "timesheet", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
    { module: "invoices", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "email-builder", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "roles", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "users", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "services", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "industries", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "companies", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
  ],
} as const;

async function ensureSharedSubstituteTechnicianRole() {
  const existing = await Role.findOne({
    name: SHARED_SUBSTITUTE_TECHNICIAN_ROLE.name,
    isSystemRole: true,
    isDefaultRole: true,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (existing) return;

  // Role schema requires companyId. Use a stable ObjectId value for this global shared role.
  const sharedCompanyId = new mongoose.Types.ObjectId("000000000000000000000001");
  await Role.create({
    companyId: sharedCompanyId,
    name: SHARED_SUBSTITUTE_TECHNICIAN_ROLE.name,
    description: SHARED_SUBSTITUTE_TECHNICIAN_ROLE.description,
    permissions: SHARED_SUBSTITUTE_TECHNICIAN_ROLE.permissions,
    isSystemRole: true,
    isDefaultRole: true,
    isActive: true,
    createdBy: null,
  });
}

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
  await ensureSharedSubstituteTechnicianRole();
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

  // Keep one shared copy per system default role name across all companies.
  const uniqueDefaultRoles = Array.from(
    (getDefaultRoles as any[]).reduce((acc, role: any) => {
      if (!acc.has(role.name)) acc.set(role.name, role);
      return acc;
    }, new Map<string, any>()).values()
  );

  const defaultIds = new Set(uniqueDefaultRoles.map((r: any) => r._id.toString()));
  const otherRoles = (dbRoles as any[]).filter((r: any) => !defaultIds.has(r._id.toString()));

  // If company has a custom role with the same name as a default role,
  // hide the shared default for that company (company-specific override).
  const companyRoleNames = new Set(otherRoles.map((r: any) => r.name));
  const visibleDefaultRoles = uniqueDefaultRoles.filter((r: any) => !companyRoleNames.has(r.name));

  let roles = [...visibleDefaultRoles, ...otherRoles];

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
