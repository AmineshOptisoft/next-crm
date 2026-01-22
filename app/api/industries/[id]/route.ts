import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Industry } from "@/app/models/Industry";
import { getCurrentUser, requireSuperAdmin } from "@/lib/auth";
import { validateCompanyAccess } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Non-super-admin users must have a company (general guardrail)
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

  const { id } = await params;
  await connectDB();

  const industry = await Industry.findOne({ _id: id }).lean();

  if (!industry) {
    return NextResponse.json({ error: "Industry not found" }, { status: 404 });
  }

  return NextResponse.json(industry);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await requireSuperAdmin(user.userId);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can update industries" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const name = (body?.name ?? "").toString().trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectDB();

  const existing = await Industry.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Industry not found" }, { status: 404 });
  }

  // Enforce global uniqueness among active industries
  const duplicate = await Industry.findOne({
    name,
    isActive: true,
    _id: { $ne: existing._id },
  }).lean();

  if (duplicate) {
    return NextResponse.json(
      { error: "Industry with this name already exists" },
      { status: 400 }
    );
  }

  const updated = await Industry.findByIdAndUpdate(
    id,
    { $set: { name } },
    { new: true, runValidators: true }
  ).lean();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await requireSuperAdmin(user.userId);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can delete industries" },
      { status: 403 }
    );
  }

  const { id } = await params;
  await connectDB();

  const industry = await Industry.findById(id);
  if (!industry) {
    return NextResponse.json({ error: "Industry not found" }, { status: 404 });
  }

  await Industry.findByIdAndUpdate(id, { isActive: false });

  return NextResponse.json({ message: "Industry deleted successfully" });
}

