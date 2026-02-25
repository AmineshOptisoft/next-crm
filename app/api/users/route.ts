import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_IDS, defaultRoleIdToName, isDefaultRoleId } from "@/lib/staticDefaultRoles";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const isAdmin = await requireCompanyAdmin(user.userId);

  // Non-admins (e.g. technicians with contacts permission) get limited user data
  // needed for things like FSR dropdowns on the contacts page
  if (!isAdmin) {
    const filter = {
      ...buildCompanyFilter(user),
      isActive: true,
      role: { $ne: "contact" },
    };
    const users = await User.find(filter)
      .populate("customRoleId", "name")
      .select("firstName lastName customRoleId zone defaultRoleName")
      .lean();
    const mapped = (users as any[]).map((u) => {
      if (u.defaultRoleName && !u.customRoleId) {
        u.customRoleId = { _id: DEFAULT_ROLE_IDS[u.defaultRoleName], name: u.defaultRoleName };
      }
      return u;
    });
    return NextResponse.json(mapped);
  }

  // Admins get full user data
  const filter = {
    ...buildCompanyFilter(user),
    isActive: true,
    role: { $ne: "contact" },
  };
  const users = await User.find(filter)
    .populate("customRoleId", "name permissions")
    .select("-passwordHash -verificationToken")
    .sort({ createdAt: -1 })
    .lean();

  const mapped = (users as any[]).map((u) => {
    if (u.defaultRoleName && !u.customRoleId) {
      u.customRoleId = { _id: DEFAULT_ROLE_IDS[u.defaultRoleName], name: u.defaultRoleName };
    }
    return u;
  });
  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can create users" },
      { status: 403 }
    );
  }

  // Validate user has company access
  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const body = await req.json();
  const { firstName, lastName, email, password, customRoleId } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const createPayload: any = {
    ...body,
    passwordHash,
    role: "company_user",
    companyId: user.companyId,
    isVerified: true,
    isActive: true,
  };
  if (createPayload.customRoleId === "" || createPayload.customRoleId === "none") {
    createPayload.customRoleId = null;
    createPayload.defaultRoleName = null;
  } else if (createPayload.customRoleId && isDefaultRoleId(createPayload.customRoleId)) {
    createPayload.defaultRoleName = defaultRoleIdToName(createPayload.customRoleId) || null;
    createPayload.customRoleId = null;
  } else {
    createPayload.defaultRoleName = null;
  }

  const newUser = await User.create(createPayload);

  const userResponse = await User.findById((newUser as any)._id)
    .populate("customRoleId", "name permissions")
    .select("-passwordHash -verificationToken")
    .lean();

  const u = userResponse as any;
  if (u?.defaultRoleName && !u.customRoleId) {
    u.customRoleId = { _id: DEFAULT_ROLE_IDS[u.defaultRoleName], name: u.defaultRoleName };
  }
  return NextResponse.json(u, { status: 201 });
}