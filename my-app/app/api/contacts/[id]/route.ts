import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission, buildCompanyFilter } from "@/lib/permissions";

type Context = { params: Promise<{ id: string }> } | { params: { id: string } };

async function resolveParams(context: Context) {
  const maybePromise = (context as any).params;
  const resolved =
    maybePromise && typeof maybePromise.then === "function"
      ? await maybePromise
      : maybePromise;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("contacts", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);

  await connectDB();

  // Build filter: super admins can access any contact, regular users only their company's
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const contact = await Contact.findOne(filter).lean();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("contacts", "edit");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);
  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    status,
    companyId: newCompanyId,
    streetAddress,
    city,
    state,
    zipCode,
    billingAddress,
    shippingAddress,
    shippingAddresses,
    smsStatus,
    emailStatus,
    bathrooms,
    bedrooms,
    specialInstructions,
    image,
    password,
    defaultPaymentMethod,
    billedAmount,
    billedHours,
    keyNumber,
    preferences,
    familyInfo,
    parkingAccess,
    preferredTechnician,
    clientNotesFromTech,
    specialInstructionsClient,
    specialInstructionsAdmin,
    notes,
    billingNotes,
    discount,
    tags,
    fsrAssigned,
    serviceDefaults
  } = body;

  const name = body.name || `${firstName || ""} ${lastName || ""}`.trim();

  await connectDB();

  // Build filter: super admins can edit any contact, regular users only their company's
  const filter = { _id: id, ...buildCompanyFilter(user) };

  // Prepare update data
  const updateData: any = {
    name,
    firstName,
    lastName,
    email,
    phone,
    company,
    status,
    image,
    billingAddress,
    shippingAddress,
    shippingAddresses,
    smsStatus,
    emailStatus,
    bathrooms,
    bedrooms,
    specialInstructions,
    defaultPaymentMethod,
    billedAmount,
    billedHours,
    keyNumber,
    preferences,
    familyInfo,
    parkingAccess,
    preferredTechnician,
    clientNotesFromTech,
    specialInstructionsClient,
    specialInstructionsAdmin,
    notes,
    billingNotes,
    discount,
    tags,
    fsrAssigned,
    serviceDefaults
  };

  // Handle nested address update if basic address fields are provided
  if (streetAddress || city || state || zipCode) {
    updateData.address = {
      street: streetAddress,
      city,
      state,
      zipCode
    };
  }

  // Update password only if provided
  if (password) {
    updateData.password = password;
  }

  // Super admins can change the companyId (reassign contact to different company)
  if (user.role === "super_admin" && newCompanyId) {
    updateData.companyId = newCompanyId;
  }

  const contact = await Contact.findOneAndUpdate(
    filter,
    updateData,
    { new: true }
  ).lean();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function DELETE(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("contacts", "delete");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);

  await connectDB();

  // Build filter: super admins can delete any contact, regular users only their company's
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const deleted = await Contact.findOneAndDelete(filter).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Contact deleted" });
}
