import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/app/models/Activity";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const dealId = searchParams.get("dealId");
  const type = searchParams.get("type");

  await connectDB();

  const filter: any = { ownerId: user.userId };
  if (contactId) filter.contactId = contactId;
  if (dealId) filter.dealId = dealId;
  if (type) filter.type = type;

  const activities = await Activity.find(filter)
    .populate("contactId", "name email")
    .populate("assignedTo", "firstName lastName")
    .sort({ scheduledAt: -1, createdAt: -1 })
    .lean();

  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    contactId,
    dealId,
    type,
    subject,
    description,
    duration,
    outcome,
    scheduledAt,
    completedAt,
    status,
    assignedTo,
  } = body;

  if (!contactId || !type || !subject) {
    return NextResponse.json(
      { error: "Contact ID, type, and subject are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const activity = await Activity.create({
    ownerId: user.userId,
    contactId,
    dealId,
    type,
    subject,
    description,
    duration,
    outcome,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    completedAt: completedAt ? new Date(completedAt) : undefined,
    status: status || "scheduled",
    assignedTo,
  });

  return NextResponse.json(activity, { status: 201 });
}
