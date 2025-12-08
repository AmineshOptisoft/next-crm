import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/app/models/Activity";
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
  const permCheck = await checkPermission("activities", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);

  await connectDB();
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const activity = await Activity.findOne(filter)
    .populate("contactId", "name email")
    .populate("assignedTo", "firstName lastName")
    .lean();

  if (!activity) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(activity);
}

export async function PUT(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("activities", "edit");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);
  const body = await req.json();

  await connectDB();
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const activity = await Activity.findOneAndUpdate(
    filter,
    body,
    { new: true, runValidators: true }
  )
    .populate("contactId", "name email")
    .populate("assignedTo", "firstName lastName")
    .lean();

  if (!activity) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(activity);
}

export async function DELETE(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("activities", "delete");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);

  await connectDB();
  const filter = { _id: id, ...buildCompanyFilter(user) };
  const deleted = await Activity.findOneAndDelete(filter).lean();

  if (!deleted) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Activity deleted successfully" });
}
