import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/app/models/Employee";

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
    const employees = await Employee.find({ companyId: user.companyId }).sort({
      createdAt: -1,
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
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

    const employee = await Employee.create({
      ...body,
      companyId: user.companyId,
      ownerId: user.userId,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
