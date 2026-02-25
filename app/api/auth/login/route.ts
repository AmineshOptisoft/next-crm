import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema } from "@/app/(auth)/login/schema";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0] as any;
    return NextResponse.json(
      { error: firstError.message, field: firstError.path[0] },
      { status: 400 }
    );
  }

  const { email, password } = parseResult.data;

  const user = await User.findOne({ email }).select(
    "_id passwordHash email role companyId firstName lastName companyName"
  ).lean();
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString() || null,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  const res = NextResponse.json({ message: "Logged in" });
  res.cookies.set("crm_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Welcome email in background — don't await import or send so login response returns fast
  if (user.companyId) {
    setImmediate(() => {
      import("@/lib/sendmailhelper")
        .then(({ sendTransactionalEmail }) =>
          sendTransactionalEmail(
            "01_welcome_email",
            user.email,
            {
              firstname: user.firstName,
              lastname: user.lastName,
              company_name: user.companyName || "CRM",
            },
            user.companyId!.toString()
          )
        )
        .catch((e) => console.error("Welcome email async error:", e));
    });
  }

  return res;
}
