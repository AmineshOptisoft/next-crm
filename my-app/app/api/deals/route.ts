import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Deal } from "@/app/models/Deal";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const permCheck = await checkPermission("deals", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  await connectDB();
  
  // Build filter: super admins see all deals, regular users see only their company's deals
  const { buildCompanyFilter } = await import("@/lib/permissions");
  const filter = buildCompanyFilter(user);
  
  const deals = await Deal.find(filter)
    .populate("contactId")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const permCheck = await checkPermission("deals", "create");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  // Validate user has company access
  const { validateCompanyAccess } = await import("@/lib/permissions");
  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const body = await req.json();
  const { title, value, stage, contactId, closeDate } = body as {
    title?: string;
    value?: number | string;
    stage?: string;
    contactId?: string;
    closeDate?: string;
  };

  if (!title || value === undefined || value === null || value === "") {
    return NextResponse.json(
      { error: "Title and value are required" },
      { status: 400 }
    );
  }

  const numericValue =
    typeof value === "string" ? parseFloat(value) : Number(value);

  await connectDB();

  // Optional: verify contact belongs to this company if contactId is present
  let contactObjectId = undefined;
  if (contactId) {
    const contact = await Contact.findOne({
      _id: contactId,
      companyId: user.companyId,
    }).lean();
    if (!contact) {
      return NextResponse.json(
        { error: "Invalid contact for this company" },
        { status: 400 }
      );
    }
    contactObjectId = contactId;
  }

  const deal = await Deal.create({
    companyId: user.companyId,
    ownerId: user.userId,
    title,
    value: numericValue,
    stage: stage || "new",
    contactId: contactObjectId,
    closeDate: closeDate ? new Date(closeDate) : undefined,
  });

  return NextResponse.json(deal, { status: 201 });
}
