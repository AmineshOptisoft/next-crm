import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "../../../models/User";
import { Role, createDefaultRoles } from "../../../models/Role";
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

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Temporarily disabled for testing
  // if (!user.isVerified) {
  //   return NextResponse.json(
  //     { error: "Please verify your email first" },
  //     { status: 403 }
  //   );
  // }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Ensure default roles exist for the company on every login (for any user with a companyId).
  // createDefaultRoles uses upsert so existing roles are never duplicated.
  if (user.companyId) {
    try {
      await createDefaultRoles(user.companyId.toString(), user._id.toString());

      // Seed email campaigns on login just in case this is a preexisting user who hasn't gotten them yet
      const { seedDefaultEmailCampaigns } = await import("@/lib/seedEmailCampaigns");
      await seedDefaultEmailCampaigns(user.companyId.toString(), user._id.toString());

      // Auto-assign the "Viewer" default role to company_users who have no role yet,
      // so they see the sidebar modules on first login.
      if (user.role === "company_user" && !user.customRoleId) {
        const viewerRole = await Role.findOne({
          companyId: user.companyId,
          name: "Viewer",
          isActive: true,
        });
        if (viewerRole) {
          await User.findByIdAndUpdate(user._id, {
            customRoleId: viewerRole._id,
          });
        }
      }
    } catch (err) {
      // Non-fatal — log the error but don't block the login
      console.error("Failed to seed default roles on login:", err);
    }
  }

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  const res = NextResponse.json({ message: "Logged in" });

  // Send "Welcome to CRM!" email
  if (user.companyId) {
    try {
      const { sendTransactionalEmail } = await import("@/lib/sendmailhelper");
      // Don't await this so it doesn't block login response
      sendTransactionalEmail(
        "01_welcome_email", // Use the built-in templateId
        user.email,
        {
          firstname: user.firstName,
          lastname: user.lastName,
          company_name: user.companyName || "CRM",
        },
        user.companyId.toString()
      ).catch(e => console.error("Welcome email async error:", e));
    } catch (e) {
      console.error("Failed to send welcome email:", e);
    }
  }
  res.cookies.set("crm_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res;
}
