import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { getCurrentUser } from "@/lib/auth";
import { sendMailWithCampaignProvider } from "@/lib/mail";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { testEmail, testData } = body;

        if (!testEmail) {
            return NextResponse.json({ error: "Test email is required" }, { status: 400 });
        }

        const campaign = await EmailCampaign.findOne({
            _id: id,
            companyId: user.companyId
        });

        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        let html = campaign.html;

        // Personalization
        const { personalizeEmail } = await import("@/lib/mail");
        html = personalizeEmail(campaign.html, {
            ...testData,
            firstName: testData.firstname,
            lastName: testData.lastname,
            phoneNumber: testData.phone,
            companyName: testData.company
        });

        await sendMailWithCampaignProvider({
            campaignId: id,
            to: testEmail,
            subject: `[TEST] ${campaign.subject}`,
            html: html
        });

        return NextResponse.json({ success: true, message: "Test email sent successfully" });
    } catch (error: any) {
        console.error("Test mail error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
