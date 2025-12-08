import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission, buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const permCheck = await checkPermission("contacts", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  await connectDB();
  
  // Build filter: super admins see all contacts, regular users see only their company's contacts
  const filter = buildCompanyFilter(user);
  
  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const permCheck = await checkPermission("contacts", "create");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const body = await req.json();
  const { name, email, phone, company, status, companyId: requestCompanyId } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Determine which companyId to use
  let targetCompanyId: string;
  
  if (user.role === "super_admin") {
    // Super admin must provide companyId
    if (!requestCompanyId) {
      return NextResponse.json({ error: "Company selection is required" }, { status: 400 });
    }
    targetCompanyId = requestCompanyId;
  } else {
    // Regular users use their own companyId
    if (!user.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }
    targetCompanyId = user.companyId;
  }

  await connectDB();
  const contact = await Contact.create({
    companyId: targetCompanyId,
    ownerId: user.userId,
    name,
    email,
    phone,
    company,
    status: status || "lead",
  });

  return NextResponse.json(contact, { status: 201 });
}
