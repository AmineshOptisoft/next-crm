import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/app/models/Task";
import { checkPermission, buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const permCheck = await checkPermission("tasks", "view");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    await connectDB();
    
    const filter = buildCompanyFilter(user);
    
    const tasks = await Task.find(filter)
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
    const permCheck = await checkPermission("tasks", "create");
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
