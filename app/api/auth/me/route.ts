import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { AuthPayload } from "@/lib/auth";
import { getDefaultRoleByName, DEFAULT_ROLE_IDS } from "@/lib/staticDefaultRoles";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("crm_token")?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthPayload;

    await connectDB();
    
    // Single consolidated query with population
    const user = await User.findById(payload.userId)
      .populate("companyId", "name profileCompleted")
      .populate("customRoleId", "permissions")
      .lean();

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const company = user.companyId as any;
    const role = user.customRoleId as any;
    const defaultRoleName = (user as any).defaultRoleName;
    let customRoleId: string | null = null;
    let permissions: any[] = [];
    if (defaultRoleName) {
      customRoleId = DEFAULT_ROLE_IDS[defaultRoleName] || null;
      const defaultRole = getDefaultRoleByName(defaultRoleName as any);
      permissions = defaultRole?.permissions || [];
    } else if (role) {
      customRoleId = role._id.toString();
      permissions = role?.permissions || [];
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: company ? {
          _id: company._id.toString(),
          name: company.name,
          profileCompleted: company.profileCompleted || false,
        } : null,
        companyName: company?.name || user.companyName || "",
        countryId: user.countryId || "",
        stateId: user.stateId || "",
        cityId: user.cityId || "",
        avatarUrl: user.avatarUrl || "",
        customRoleId,
        permissions,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
