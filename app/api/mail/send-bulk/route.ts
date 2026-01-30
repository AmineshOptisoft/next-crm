import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { sendMailWithCompanyProvider } from "@/lib/mail";
import { Company } from "@/app/models/Company";
import EmailCampaign from "@/app/models/EmailCampaign";
import { getCurrentUser } from "@/lib/auth";

// POST endpoint to send bulk emails to selected addresses with company provider check
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        // const user = await getCurrentUser();

        // if (!user) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const body = await req.json();
        const { companyId, to } = body;

        // Security check: ensure the user belongs to the company they are trying to send from
        // if (user.companyId.toString() !== companyId) {
        //     return NextResponse.json({ error: "Forbidden: Company ID mismatch" }, { status: 403 });
        // }

        if (!Array.isArray(to) || to.length === 0) {
            return NextResponse.json({ error: "Missing required fields: to (array)" }, { status: 400 });
        }


        // Fetch subject and html from the latest active EmailCampaign for this company
        const campaign = await EmailCampaign.findOne({ companyId, status: "active" }).sort({ updatedAt: -1 });
        if (!campaign) {
            return NextResponse.json({ error: "No active email campaign found for this company" }, { status: 404 });
        }
        const { subject, html } = campaign;
        if (!subject || !html) {
            return NextResponse.json({ error: "Email campaign missing subject or html" }, { status: 400 });
        }

        // Send emails one by one (can be optimized for parallel sending)
        const { User } = await import("@/app/models/User");
        const { personalizeEmail } = await import("@/lib/mail");
        const results = [];
        for (const email of to) {
            try {
                // Personalize content if user exists in DB
                const recipientUser = await User.findOne({ email, companyId });
                const personalizedHtml = personalizeEmail(html, recipientUser);

                const result = await sendMailWithCompanyProvider({
                    companyId,
                    to: email,
                    subject,
                    html: personalizedHtml,
                });
                results.push({ email, success: true, messageId: result.messageId });
            } catch (err: any) {
                results.push({ email, success: false, error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("[Bulk Mail Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
