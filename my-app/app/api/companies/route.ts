import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { getCurrentUser, requireSuperAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await requireSuperAdmin(user.userId);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can view all companies" },
      { status: 403 }
    );
  }

  await connectDB();

  const companies = await Company.find()
    .populate("adminId", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(companies);
}
