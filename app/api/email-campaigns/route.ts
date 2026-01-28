import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
    const permCheck = await checkPermission("email-builder", "view");
    if (!permCheck.authorized) {
        return permCheck.response;
    }
    const user = permCheck.user;

    await connectDB();

    const campaigns = await EmailCampaign.find({
        companyId: user.companyId
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: campaigns });
}

export async function POST(req: NextRequest) {
    const permCheck = await checkPermission("email-builder", "create");
    if (!permCheck.authorized) {
        return permCheck.response;
    }
    const user = permCheck.user;

    try {
        const body = await req.json();
        console.log("POST /api/email-campaigns body:", JSON.stringify(body).substring(0, 200) + "...");
        const { name, subject, content, design, reminders, status } = body;

        if (!subject) {
            return NextResponse.json({ error: "Subject is required" }, { status: 400 });
        }
        if (!content) {
            return NextResponse.json({ error: "Content (HTML) is required" }, { status: 400 });
        }

        await connectDB();

        const campaign = await EmailCampaign.create({
            createdBy: user.userId,
            companyId: user.companyId,
            name: name || subject,
            subject,
            html: content,
            design: design, // Schema.Types.Mixed handles objects
            reminders: reminders || [],
            status: status || "draft"
        });

        return NextResponse.json({ success: true, data: campaign }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating email campaign:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
