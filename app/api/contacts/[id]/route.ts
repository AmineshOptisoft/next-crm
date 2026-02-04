import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission, buildCompanyFilter } from "@/lib/permissions";
import bcrypt from "bcryptjs";

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
  const filter = {
    _id: id,
    ...buildCompanyFilter(user),
    role: "contact" // Ensure we only get users who are contacts
  };
  const contact = await User.findOne(filter).lean();

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
    country,
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
    zoneName,
    fsrAssigned,
    staxId,
    serviceDefaults
  } = body;

  const fullName = body.name || `${firstName || ""} ${lastName || ""}`.trim();

  await connectDB();

  // Check if contact exists and belongs to company
  const filter = {
    _id: id,
    ...buildCompanyFilter(user),
    role: "contact"
  };

  const existingContact = await User.findOne(filter);
  if (!existingContact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Prepare update data
  const updateData: any = {
    firstName: firstName || fullName.split(' ')[0],
    lastName: lastName || fullName.split(' ').slice(1).join(' '),
    email,
    phoneNumber: phone,
    companyName: company,
    contactStatus: status,
    avatarUrl: image,
    address: streetAddress,
    country,
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
    zoneName,
    zone: zoneName,
    fsrAssigned,
    staxId,
    serviceDefaults
  };

  // Update password only if provided
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  // Super admins can change the companyId (reassign contact to different company)
  if (user.role === "super_admin" && newCompanyId) {
    updateData.companyId = newCompanyId;
  }

  const updatedContact = await User.findOneAndUpdate(
    filter,
    { $set: updateData },
    { new: true }
  ).lean();

  return NextResponse.json(updatedContact);
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
  const filter = {
    _id: id,
    ...buildCompanyFilter(user),
    role: "contact"
  };
  const deleted = await User.findOneAndDelete(filter).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Contact deleted" });
}
