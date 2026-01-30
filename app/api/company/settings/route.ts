import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate user has company access
  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  await connectDB();

  const company = await Company.findById(user.companyId).lean();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can update company settings" },
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

  await connectDB();

  // Get current company to preserve fields and check completeness
  const currentCompany = await Company.findById(user.companyId);
  if (!currentCompany) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Merge current data with update data for completeness check
  // This ensures that if we only update mailConfig, other fields like name/logo are still counted
  const mergedData = {
    ...currentCompany.toObject(),
    ...body
  };

  // Check if all required fields are present for profile completion
  const isProfileComplete = !!(
    mergedData.name &&
    mergedData.logo &&
    mergedData.industry &&
    mergedData.email &&
    mergedData.phone &&
    mergedData.address?.street &&
    mergedData.address?.city &&
    mergedData.address?.state &&
    mergedData.address?.country &&
    mergedData.address?.zipCode &&
    mergedData.address?.latitude &&
    mergedData.address?.longitude
  );

  // Update company with profileCompleted status
  // We use the body for the update but include the calculated profileCompleted
  const updateData = {
    ...body,
    profileCompleted: isProfileComplete,
  };

  const company = await Company.findByIdAndUpdate(
    user.companyId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Convert to plain object to ensure all fields are returned
  const companyObject = company.toObject();

  return NextResponse.json(companyObject);
}
