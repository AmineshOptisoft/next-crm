import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { Company } from "@/app/models/Company";
import { sendTransactionalEmail } from "@/lib/sendmailhelper";
import bcrypt from "bcryptjs";
import { z } from "zod";

const publicRegisterSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  sourceSubdomain: z.string().optional(),
});

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();

  const parseResult = publicRegisterSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, field: firstError.path[0] },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, password, phone, sourceSubdomain } = parseResult.data;

  const subdomain =
    sourceSubdomain && sourceSubdomain.trim().length > 0
      ? sourceSubdomain.trim().toLowerCase()
      : req.nextUrl.searchParams.get("subdomain")?.toLowerCase() || "";

  if (!subdomain) {
    return NextResponse.json(
      { error: "Missing subdomain. Please use your company's public link." },
      { status: 400 }
    );
  }

  const company = await Company.findOne({
    $or: [{ subdomain }, { "publicSites.subdomain": subdomain }],
  })
    .select("_id name")
    .lean();

  if (!company) {
    return NextResponse.json(
      { error: "Company not found for this link. Please contact support." },
      { status: 404 }
    );
  }

  const companyIdStr = company._id.toString();

  // Check if a user with this email already exists
  const existing = await User.findOne({ email }).select(
    "_id role companyId companyName firstName lastName"
  );

  if (existing) {
    // If they are already a contact for this company, just respond OK
    if (existing.role === "contact" && existing.companyId?.toString() === companyIdStr) {
      return NextResponse.json({
        message: "You are already registered. Please log in.",
        alreadyRegistered: true,
      });
    }

    // If they are a contact but without company, attach them
    if (existing.role === "contact" && !existing.companyId) {
      existing.companyId = company._id;
      existing.companyName = company.name;
      existing.leadSource = existing.leadSource || "website";
      if (password) {
        existing.passwordHash = await bcrypt.hash(password, 10);
      }
      await existing.save();

      // Best-effort welcome email via company provider
      try {
        await sendTransactionalEmail(
          "01_welcome_email",
          email,
          {
            firstname: existing.firstName || firstName,
            lastname: existing.lastName || lastName || "",
            company_name: company.name,
          },
          companyIdStr
        );
      } catch (e) {
        console.error("Public-register welcome email (existing contact) error:", e);
      }

      return NextResponse.json({
        message: "Registered successfully.",
      });
    }

    // For any other role, don't create a duplicate account
    return NextResponse.json(
      {
        error: "An account with this email already exists. Please log in instead.",
      },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    firstName,
    lastName: lastName || "",
    email,
    passwordHash,
    role: "contact",
    companyId: company._id,
    companyName: company.name,
    phoneNumber: phone,
    contactStatus: "lead",
    leadSource: "website",
    isVerified: true,
  });

  // Best-effort welcome email via company provider
  try {
    await sendTransactionalEmail(
      "01_welcome_email",
      email,
      {
        firstname: firstName,
        lastname: lastName || "",
        company_name: company.name,
      },
      companyIdStr
    );
  } catch (e) {
    console.error("Public-register welcome email error:", e);
  }

  return NextResponse.json({
    message: "Registered successfully.",
  });
}

