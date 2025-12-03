import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/app/models/Task";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    await connectDB();
    const tasks = await Task.find({ companyId: user.companyId })
      .populate("assignedTo")
      .sort({ createdAt: -1 });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const body = await req.json();
    await connectDB();

    const task = await Task.create({
      ...body,
      companyId: user.companyId,
      ownerId: user.userId,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
