import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Deal } from "@/app/models/Deal";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  await connectDB();
  const deals = await Deal.find({ companyId: user.companyId })
    .populate("contactId")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
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
