import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role, createDefaultRoles } from "@/app/models/Role";
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

  // For company admins, always ensure default roles exist for their company.
  // This guarantees new admins see the default roles immediately, even if
  // createDefaultRoles wasn't called yet for their company.
  if (user.companyId) {
    try {
      await createDefaultRoles(user.companyId, user.userId);
    } catch (err) {
      // Non-fatal — don't block the response
      console.error("Failed to ensure default roles:", err);
    }
  }

  const url = new URL(req.url);
  const creatorFilter = url.searchParams.get("creator");

  const filter: any = { ...buildCompanyFilter(user), isActive: true };
  if (creatorFilter === "me") {
    filter.createdBy = user.userId;
  }

  let roles = await Role.find(filter)
    .populate("createdBy", "firstName lastName email")
    .populate("companyId", "name")
    .sort({ isDefaultRole: -1, createdAt: -1 }) // default roles first
    .lean();

  // For super admins, deduplicate system roles (show only one instance of each system role)
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
