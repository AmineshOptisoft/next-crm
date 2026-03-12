import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { checkPermission, buildCompanyFilter } from "@/lib/permissions";
import bcrypt from "bcryptjs";

function buildListProjection() {
  // Keep this aligned with UI usage across app (contacts list + booking contact dropdown).
  return [
    "_id",
    "firstName",
    "lastName",
    "email",
    "phoneNumber",
    "companyName",
    "companyId",
    "contactStatus",
    "zoneName",
    "fsrAssigned",
    "staxId",
    "createdAt",
    "avatarUrl",
    "address",
    "country",
    "state",
    "city",
    "zipCode",
    "lastAppointment",
    "nextAppointment",
    "role",
  ].join(" ");
}

export async function GET(req: NextRequest) {
  const permCheck = await checkPermission("contacts", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  await connectDB();

  // Build filter: super admins see all contacts, regular users see only their company's contacts
  const baseFilter: any = {
    ...buildCompanyFilter(user),
    role: "contact" // Only return users who are contacts
  };

  const sp = req.nextUrl.searchParams;
  const limitParam = sp.get("limit");
  const q = (sp.get("q") || "").trim();
  const status = (sp.get("status") || "").trim();
  const zone = (sp.get("zone") || "").trim();
  const stax = (sp.get("stax") || "").trim(); // "stax" | "non-stax" | ""

  const hasQueryParams = sp.size > 0;

  const filter: any = { ...baseFilter };
  if (status && status !== "all") filter.contactStatus = status;
  if (zone && zone !== "all") filter.zoneName = zone;
  if (stax === "stax") filter.staxId = { $exists: true, $ne: null, $ne: "" };
  if (stax === "non-stax") filter.$or = [{ staxId: { $exists: false } }, { staxId: null }, { staxId: "" }];
  if (q) {
    // Case-insensitive match on name/email; avoids heavy regex on unindexed concatenation.
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      ...(filter.$or || []),
      { firstName: rx },
      { lastName: rx },
      { email: rx },
    ];
  }

  const projection = buildListProjection();

  // Default (no params): preserve array response for existing callers.
  if (!hasQueryParams) {
    const contacts = await User.find(filter)
      .select(projection)
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(contacts);
  }

  const limit = Math.max(1, Math.min(1000, Number(limitParam) || 200));

  const [items, total, withStax, withoutStax] = await Promise.all([
    User.find(filter).select(projection).sort({ createdAt: -1 }).limit(limit).lean(),
    User.countDocuments(filter),
    User.countDocuments({ ...filter, staxId: { $exists: true, $ne: null, $ne: "" } }),
    User.countDocuments({ ...filter, $or: [{ staxId: { $exists: false } }, { staxId: null }, { staxId: "" }] }),
  ]);

  return NextResponse.json({
    items,
    total,
    stats: { withStax, withoutStax },
  });
}

export async function POST(req: NextRequest) {
  const permCheck = await checkPermission("contacts", "create");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    status,
    companyId: requestCompanyId,
    password,
    streetAddress,
    country,
    city,
    state,
    zipCode,
    bathrooms,
    bedrooms,
    specialInstructions,
    image,
    billingAddress,
    shippingAddress,
    shippingAddresses,
    smsStatus,
    emailStatus,
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

  if (!fullName) {
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

  // Check if email already exists
  if (email) {
    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }
  }

  // Hash password if provided
  let passwordHash = "";
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  } else {
    // Generate a random password if none provided, or just leave empty if login is optional
    // For now, let's assume they might set it later or we generate one.
    passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
  }

  const contact = await User.create({
    role: "contact",
    companyId: targetCompanyId,
    ownerId: user.userId,
    firstName: firstName || fullName.split(' ')[0],
    lastName: lastName || fullName.split(' ').slice(1).join(' '),
    email,
    phoneNumber: phone,
    passwordHash,
    companyName: company,
    avatarUrl: image,
    contactStatus: status || "lead",
    country,
    address: streetAddress, // User model has string address
    city,
    state,
    zipCode,
    billingAddress,
    shippingAddress,
    shippingAddresses,
    smsStatus: smsStatus || false,
    emailStatus: emailStatus || false,
    bathrooms,
    bedrooms,
    specialInstructions,
    zoneName,
    zone: zoneName,
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
    staxId,
    serviceDefaults
  });

  return NextResponse.json(contact, { status: 201 });
}
