import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/app/models/User";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // authUser already queried the user and permissions inside getCurrentUser
  // and we also need a few extra fields like countryId, etc.
  // We can just rely on the existing user object we fetched directly
  await connectDB();
  const user = await User.findById(authUser.userId).lean();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      companyId: authUser.companyId ? {
        _id: authUser.companyId,
        name: authUser.companyName
      } : null,
      companyName: authUser.companyName || user.companyName || "",
      countryId: user.countryId || "",
      stateId: user.stateId || "",
      cityId: user.cityId || "",
      avatarUrl: user.avatarUrl || "",
      customRoleId: user.customRoleId?.toString() || null,
      permissions: authUser.permissions || [],
    },
  });
}
