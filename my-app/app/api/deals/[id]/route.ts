import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Deal } from "@/app/models/Deal";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved =
    maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("deals", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const deal = await Deal.findOne({ _id: id, companyId: user.companyId })
    .populate("contactId")
    .lean();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json(deal);
}

export async function PUT(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("deals", "edit");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);
  const body = await req.json();
  const { title, value, stage, contactId, closeDate } = body as {
    title?: string;
    value?: number | string;
    stage?: string;
    contactId?: string;
    closeDate?: string;
  };

  await connectDB();

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

  const update: any = {};
  if (title !== undefined) update.title = title;
  if (value !== undefined) {
    const numericValue =
      typeof value === "string" ? parseFloat(value) : Number(value);
    update.value = numericValue;
  }
  if (stage !== undefined) update.stage = stage;
  if (contactId !== undefined) update.contactId = contactObjectId || null;
  if (closeDate !== undefined)
    update.closeDate = closeDate ? new Date(closeDate) : null;

  const deal = await Deal.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
    update,
    { new: true }
  )
    .populate("contactId")
    .lean();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json(deal);
}

export async function DELETE(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("deals", "delete");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const deleted = await Deal.findOneAndDelete({
    _id: id,
    companyId: user.companyId,
  }).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deal deleted" });
}
