import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Industry } from "@/app/models/Industry";
import { getCurrentUser, requireSuperAdmin } from "@/lib/auth";
import { validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Non-super-admin users must have a company
  if (user.role !== "super_admin") {
    try {
      validateCompanyAccess(user);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      );
    }
  }

  await connectDB();

  const industries = await Industry.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(industries);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await requireSuperAdmin(user.userId);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can create industries" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = (body?.name ?? "").toString().trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectDB();

  const existing = await Industry.findOne({ name, isActive: true }).lean();
  if (existing) {
    return NextResponse.json(
      { error: "Industry with this name already exists" },
      { status: 400 }
    );
  }

  const created = await Industry.create({
    name,
    createdBy: user.userId,
    isActive: true,
  });

  return NextResponse.json(created, { status: 201 });
}

