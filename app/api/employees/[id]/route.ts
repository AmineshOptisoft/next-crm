import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
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
    const permCheck = await checkPermission("employees", "view");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    const { id } = await resolveParams(context);

    await connectDB();
    const filter = { _id: id, ...buildCompanyFilter(user), role: "employee" };
    const employee = await User.findOne(filter);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: Context) {
  try {
    const permCheck = await checkPermission("employees", "edit");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    const { id } = await resolveParams(context);
    const body = await req.json();

    await connectDB();
    const filter = { _id: id, ...buildCompanyFilter(user), role: "employee" };
    const employee = await User.findOneAndUpdate(
      filter,
      body,
      { new: true, runValidators: true }
    );

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    const permCheck = await checkPermission("employees", "delete");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    const { id } = await resolveParams(context);

    await connectDB();
    const filter = { _id: id, ...buildCompanyFilter(user), role: "employee" };
    const employee = await User.findOneAndDelete(filter);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
