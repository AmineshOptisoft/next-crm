import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
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
    const filter = {
      ...buildCompanyFilter(user),
      role: "employee"
    };

    const employees = await User.find(filter).sort({
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

    // Ensure role is a staff role, default to company_user if not provided
    const validStaffRoles = ["company_admin", "company_user", "employee"];
    const targetRole = body.role && validStaffRoles.includes(body.role) ? body.role : "employee";

    // Hash password if provided, otherwise generate a secure random one
    let passwordHash = "";
    if (body.password) {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.hash(body.password, 10);
    } else {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
    }

    const employee = await User.create({
      ...body,
      role: targetRole,
      passwordHash,
      companyId: user.companyId,
      ownerId: user.userId,
      isVerified: true,
      isActive: true,
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
