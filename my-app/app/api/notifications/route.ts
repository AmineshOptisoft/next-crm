import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/app/models/Notification";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isRead = searchParams.get("isRead");
  const limit = parseInt(searchParams.get("limit") || "50");

  await connectDB();

  const filter: any = { userId: user.userId };
  if (isRead !== null) filter.isRead = isRead === "true";

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({
    userId: user.userId,
    isRead: false,
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, title, message, relatedTo, link, priority } = body;

  if (!type || !title || !message) {
    return NextResponse.json(
      { error: "Type, title, and message are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const notification = await Notification.create({
    userId: user.userId,
    type,
    title,
    message,
    relatedTo,
    link,
    priority: priority || "medium",
  });

  return NextResponse.json(notification, { status: 201 });
}

// Mark all as read
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  await Notification.updateMany(
    { userId: user.userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return NextResponse.json({ message: "All notifications marked as read" });
}
