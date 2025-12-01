import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    firstName,
    lastName,
    email,
    companyName,
    countryId,
    stateId,
    cityId,
    currentPassword,
    newPassword,
  } = await req.json();

  await connectDB();
  const user = await User.findById(authUser.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Email change
  if (email && email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }
    user.email = email;
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password required" },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password incorrect" },
        { status: 400 }
      );
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (companyName !== undefined) user.companyName = companyName;
  if (countryId !== undefined) user.countryId = countryId;
  if (stateId !== undefined) user.stateId = stateId;
  if (cityId !== undefined) user.cityId = cityId;

  await user.save();

  return NextResponse.json({ message: "Account updated" });
}
