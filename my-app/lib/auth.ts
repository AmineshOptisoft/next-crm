import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export type AuthPayload = {
  userId: string;
  email: string;
};

export async function getCurrentUser(): Promise<AuthPayload | null> {
  try {
    // ✅ AWAIT cookies() - returns Promise in Next.js 15+
    const cookieStore = await cookies();
    const token = cookieStore.get("crm_token")?.value;

    if (!token) return null;

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthPayload;
    return payload;
  } catch {
    return null;
  }
}
