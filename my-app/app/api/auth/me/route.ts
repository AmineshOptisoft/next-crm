import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/app/models/User";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  await connectDB();
  const user = await User.findById(authUser.userId).lean();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Populate custom role to get permissions and company to get company details
  const populatedUser = await User.findById(authUser.userId)
    .populate("customRoleId")
    .populate("companyId")
    .lean();

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString() || null,
      companyName: populatedUser?.companyId?.name || user.companyName || "",
      countryId: user.countryId || "",
      stateId: user.stateId || "",
      cityId: user.cityId || "",
      customRoleId: populatedUser?.customRoleId?._id?.toString() || null,
      permissions: populatedUser?.customRoleId?.permissions || [],
    },
  });
}
