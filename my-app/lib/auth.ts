import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";

export type AuthPayload = {
  userId: string;
  email: string;
};

export type CurrentUser = AuthPayload & {
  firstName: string;
  lastName: string;
  companyName?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("crm_token")?.value;
    if (!token) return null;

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthPayload;

    await connectDB();
    const user = await User.findById(payload.userId).lean();
    if (!user) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
    };
  } catch {
    return null;
  }
}
