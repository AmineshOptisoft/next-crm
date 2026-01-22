import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Meeting } from "@/app/models/Meeting";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission, buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";
export async function GET(req: NextRequest) {
  const permCheck = await checkPermission("meetings", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  await connectDB();

  const filter: any = buildCompanyFilter(user);
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(endDate);
  }

  const meetings = await Meeting.find(filter)
    .populate("attendees.contactId", "name email")
    .populate("attendees.employeeId", "firstName lastName email")
    .populate("dealId", "title value stage")
    .sort({ startTime: 1 })
    .lean();

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const permCheck = await checkPermission("meetings", "create");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const body = await req.json();
  const {
    title,
    description,
    location,
    meetingLink,
    startTime,
    endTime,
    attendees,
    dealId,
    status,
    reminder,
    notes,
  } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Title, start time, and end time are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const meeting = await Meeting.create({
    companyId: user.companyId,
    ownerId: user.userId,
    title,
    description,
    location,
    meetingLink,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    attendees: attendees || [],
    dealId,
    status: status || "scheduled",
    reminder: reminder || { enabled: true, minutesBefore: 15 },
    notes,
  });

  return NextResponse.json(meeting, { status: 201 });
}
