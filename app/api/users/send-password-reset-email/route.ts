import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/sendmailhelper";

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, companyId, firstName, lastName } = await req.json();

  if (!email || !companyId) {
    return NextResponse.json(
      { error: "Missing required fields: email, companyId" },
      { status: 400 }
    );
  }

  const result = await sendTransactionalEmail(
    "13_reset_password",
    email,
    {
      firstname: firstName || "",
      lastname: lastName || "",
      email,
    },
    companyId
  );

  if (!result.sent) {
    // Non-fatal: log and return success to not break the UI flow
    console.warn(
      `[Reset Password Email] Could not send to ${email}: ${result.error}`
    );
    return NextResponse.json(
      { sent: false, error: result.error },
      { status: 200 }
    );
  }

  return NextResponse.json({ sent: true });
}
