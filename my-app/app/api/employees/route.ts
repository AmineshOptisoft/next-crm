import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/app/models/Employee";
import { checkPermission, buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const permCheck = await checkPermission("employees", "view");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    await connectDB();
    
    // Build filter: super admins see all employees, regular users see only their company's employees
    const filter = buildCompanyFilter(user);
    
    const employees = await Employee.find(filter).sort({
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
    const permCheck = await checkPermission("employees", "create");
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const user = permCheck.user;

    // Validate user has company access
    try {
      validateCompanyAccess(user);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
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
