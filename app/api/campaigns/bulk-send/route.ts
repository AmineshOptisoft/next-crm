import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { sendMailWithCampaignProvider } from "@/lib/mail";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { campaignId, emails } = body;

        if (!campaignId || !emails || !Array.isArray(emails)) {
            return NextResponse.json({ error: "CampaignId and emails array are required" }, { status: 400 });
        }

        // 1. Fetch Campaign
        const campaign = await EmailCampaign.findById(campaignId);
        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        console.log(`[Bulk Send] Starting manual send for campaign: ${campaign.name}`);

        const results = [];

        // 2. Loop through emails and send
        for (const targetEmail of emails) {
            try {
                // Personalize content
                const { User } = await import("@/app/models/User");
                const { personalizeEmail } = await import("@/lib/mail");
                const recipientUser = await User.findOne({ email: targetEmail, companyId: campaign.companyId });
                const emailHtml = personalizeEmail(campaign.html, recipientUser);

                await sendMailWithCampaignProvider({
                    campaignId: campaign._id.toString(),
                    to: targetEmail,
                    subject: campaign.subject,
                    html: emailHtml,
                });

                console.log(`[Bulk Send] ✅ Sent to ${targetEmail}`);
                results.push({ email: targetEmail, status: "success" });
            } catch (err: any) {
                console.error(`[Bulk Send] ❌ Failed for ${targetEmail}: ${err.message}`);
                results.push({ email: targetEmail, status: "failed", error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            results: results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
