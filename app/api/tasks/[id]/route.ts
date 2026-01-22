import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/app/models/Task";
import { checkPermission, buildCompanyFilter } from "@/lib/permissions";

type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved =
    maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const permCheck = await checkPermission("tasks", "view");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    const { id } = await resolveParams(context);

    await connectDB();
    const filter = { _id: id, ...buildCompanyFilter(user) };
    const task = await Task.findOne(filter).populate("assignedTo");

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: Context) {
  try {
    const permCheck = await checkPermission("tasks", "edit");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    const { id } = await resolveParams(context);
    const body = await req.json();

    await connectDB();
    const filter = { _id: id, ...buildCompanyFilter(user) };
    const task = await Task.findOneAndUpdate(
      filter,
      body,
      { new: true, runValidators: true }
    ).populate("assignedTo");

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const permCheck = await checkPermission("tasks", "delete");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    const { id } = await resolveParams(context);

    await connectDB();
    const filter = { _id: id, ...buildCompanyFilter(user) };
    const task = await Task.findOneAndDelete(filter);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
