import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { sendDailyScheduleEmail } from "@/lib/sendmailhelper";

export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user ||!user.companyId || (user.role !== 'super_admin' && user.role !== 'company_admin')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    // Parse date from query param if needed, otherwise default to today
    // const { searchParams } = new URL(_req.url);
    // const dateParam = searchParams.get('date');
    // const date = dateParam ? new Date(dateParam) : new Date();

    const result = await sendDailyScheduleEmail(user.companyId.toString());

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
        message: `Daily schedule emails sent to ${result.sent} staff members.`,
        details: result
    });

  } catch (error: any) {
    console.error("[Daily Schedule API Error]", error);
    return NextResponse.json(
        { error: "Failed to send daily schedule emails" }, 
        { status: 500 }
    );
  }
}
