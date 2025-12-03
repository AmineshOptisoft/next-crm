import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  await connectDB();

  const roles = await Role.find({
    companyId: user.companyId,
    isActive: true,
  })
    .populate("createdBy", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

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

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
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
