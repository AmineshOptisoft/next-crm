import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { sendMailWithCompanyProvider } from "@/lib/mail";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { companyId, to, subject, html } = body;

        // Security check: ensure the user belongs to the company they are trying to send from
        if (user.companyId.toString() !== companyId) {
            return NextResponse.json({ error: "Forbidden: Company ID mismatch" }, { status: 403 });
        }

        if (!to || !subject || !html) {
            return NextResponse.json({ error: "Missing required fields: to, subject, html" }, { status: 400 });
        }

        const result = await sendMailWithCompanyProvider({
            companyId,
            to,
            subject,
            html,
        });

        return NextResponse.json({
            success: true,
            messageId: result.messageId
        });

    } catch (error: any) {
        console.error("[Direct Mail Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
