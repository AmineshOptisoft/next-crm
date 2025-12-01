import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contact } from "@/app/models/Contact";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  await connectDB();
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await Contact.find({ ownerId: user.userId }).sort({
    createdAt: -1,
  });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const contact = await Contact.create({
    ownerId: user.userId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    status: body.status || "lead",
  });

  return NextResponse.json(contact, { status: 201 });
}
