import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const permCheck = await checkPermission("contacts", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  await connectDB();
  const contacts = await Contact.find({ companyId: user.companyId })
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

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { name, email, phone, company, status } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectDB();
  const contact = await Contact.create({
    companyId: user.companyId,
    ownerId: user.userId,
    name,
    email,
    phone,
    company,
    status: status || "lead",
  });

  return NextResponse.json(contact, { status: 201 });
}
