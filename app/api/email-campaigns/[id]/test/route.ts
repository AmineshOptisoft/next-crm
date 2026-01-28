import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

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

        // Simple merge tag replacement
        if (testData) {
            Object.keys(testData).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, "g");
                html = html.replace(regex, testData[key]);
            });
        }

        await sendMail({
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
