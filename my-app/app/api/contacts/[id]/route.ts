import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

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

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const contact = await Contact.findOne({
    _id: id,
    companyId: user.companyId,
  }).lean();

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

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);
  const { name, email, phone, company, status } = await req.json();

  await connectDB();
  const contact = await Contact.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
    { name, email, phone, company, status },
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

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const deleted = await Contact.findOneAndDelete({
    _id: id,
    companyId: user.companyId,
  }).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Contact deleted" });
}
