import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Meeting } from "@/app/models/Meeting";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const meeting = await Meeting.findOne({ _id: id, ownerId: user.userId })
    .populate("attendees.contactId", "name email")
    .populate("attendees.employeeId", "firstName lastName email")
    .populate("dealId", "title value stage")
    .lean();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  await connectDB();

  const meeting = await Meeting.findOneAndUpdate(
    { _id: id, ownerId: user.userId },
    { $set: body },
    { new: true, runValidators: true }
  );

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const meeting = await Meeting.findOneAndDelete({
    _id: id,
    ownerId: user.userId,
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Meeting deleted successfully" });
}
