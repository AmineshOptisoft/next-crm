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
        const ReminderLog = await import("@/app/models/ReminderLog");
        const EmailActivity = await import("@/app/models/EmailActivity");
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

                // Create ReminderLog entry for successful send
                if (recipientUser?._id) {
                    await ReminderLog.default.create({
                        campaignId: campaign._id,
                        contactId: recipientUser._id,
                        reminderLabel: `API Bulk Send - ${new Date().toISOString().split('T')[0]}`,
                        status: 'sent',
                        companyId: campaign.companyId,
                    });

                    // Create EmailActivity entry
                    await EmailActivity.default.create({
                        userId: recipientUser._id,
                        campaignId: campaign._id,
                        companyId: campaign.companyId,
                        isAction: false,
                    });

                    console.log(`[API Bulk Mail] ✅ ReminderLog & EmailActivity created for ${email}`);
                }

                results.push({ email, success: true, messageId: result.messageId });
            } catch (err: any) {
                // Log failed send attempt
                const recipientUser = await User.findOne({ email, companyId });
                if (recipientUser?._id) {
                    await ReminderLog.default.create({
                        campaignId: campaign._id,
                        contactId: recipientUser._id,
                        reminderLabel: `API Bulk Send - ${new Date().toISOString().split('T')[0]}`,
                        status: 'failed',
                        error: err.message,
                        companyId: campaign.companyId,
                    });
                }
                results.push({ email, success: false, error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("[Bulk Mail Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
