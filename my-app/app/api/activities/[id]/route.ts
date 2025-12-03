import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/app/models/Activity";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved =
    maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const activity = await Activity.findOne({
    _id: id,
    companyId: user.companyId,
  })
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);
  const body = await req.json();

  await connectDB();
  const activity = await Activity.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const deleted = await Activity.findOneAndDelete({
    _id: id,
    companyId: user.companyId,
  }).lean();

  if (!deleted) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Activity deleted successfully" });
}
