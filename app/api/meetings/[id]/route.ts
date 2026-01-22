import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Meeting } from "@/app/models/Meeting";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission, buildCompanyFilter } from "@/lib/permissions";
type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved =
    maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("meetings", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);

  await connectDB();
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const meeting = await Meeting.findOne(filter)
    .populate("attendees.contactId", "name email")
    .populate("attendees.employeeId", "firstName lastName email")
    .populate("dealId", "title value stage")
    .lean();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function PUT(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("meetings", "edit");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);
  const body = await req.json();

  await connectDB();
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const meeting = await Meeting.findOneAndUpdate(
    filter,
    body,
    { new: true, runValidators: true }
  )
    .populate("attendees.contactId", "name email")
    .populate("attendees.employeeId", "firstName lastName email")
    .populate("dealId", "title value stage")
    .lean();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function DELETE(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("meetings", "delete");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);

  await connectDB();
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const deleted = await Meeting.findOneAndDelete(filter).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Meeting deleted successfully" });
}
