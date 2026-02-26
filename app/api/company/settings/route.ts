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

  const body: any = await req.json();

  await connectDB();

  // Get current company to preserve fields and check completeness
  const currentCompany = await Company.findById(user.companyId);
  if (!currentCompany) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Normalize and validate subdomain if provided
  if (body.subdomain) {
    const rawSubdomain = String(body.subdomain).trim().toLowerCase();

    // Basic pattern: letters, numbers, hyphen, 3-50 chars
    const subdomainPattern = /^[a-z0-9-]{3,50}$/;
    if (!subdomainPattern.test(rawSubdomain)) {
      return NextResponse.json(
        {
          error:
            "Invalid subdomain. Use 3-50 characters with lowercase letters, numbers, and hyphens only.",
        },
        { status: 400 }
      );
    }

    // Avoid common reserved subdomains
    const reserved = ["www", "app", "api", "admin", "dashboard"];
    if (reserved.includes(rawSubdomain)) {
      return NextResponse.json(
        { error: "This subdomain is reserved. Please choose another one." },
        { status: 400 }
      );
    }

    // Ensure uniqueness across companies (excluding current), checking both primary and array
    const existing = await Company.findOne({
      _id: { $ne: user.companyId },
      $or: [
        { subdomain: rawSubdomain },
        { "publicSites.subdomain": rawSubdomain },
      ],
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "This subdomain is already in use." },
        { status: 400 }
      );
    }

    body.subdomain = rawSubdomain;
  }

  // Merge current data with update data for completeness check
  // This ensures that if we only update mailConfig, other fields like name/logo are still counted
  const mergedData = {
    ...currentCompany.toObject(),
    ...body,
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

  // Apply changes directly on the loaded document so complex fields like
  // publicSites are always persisted correctly.
  currentCompany.set(updateData);

  const savedCompany = await currentCompany.save();

  // Convert to plain object to ensure all fields are returned
  const companyObject = savedCompany.toObject();

  return NextResponse.json(companyObject);
}
