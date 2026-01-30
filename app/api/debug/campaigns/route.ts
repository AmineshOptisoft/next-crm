import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // Get all campaigns with detailed info
        const allCampaigns = await EmailCampaign.find({}).lean();

        // Get active campaigns with enabled reminders (what cron looks for)
        const activeCampaigns = await EmailCampaign.find({
            status: 'active',
            'reminders.enabled': true,
        }).lean();

        return NextResponse.json({
            success: true,
            total: allCampaigns.length,
            active: activeCampaigns.length,
            allCampaigns: allCampaigns.map(c => ({
                id: c._id,
                name: c.name,
                status: c.status,
                remindersCount: c.reminders?.length || 0,
                enabledReminders: c.reminders?.filter((r: any) => r.enabled).length || 0,
                reminders: c.reminders
            })),
            activeCampaigns: activeCampaigns.map(c => ({
                id: c._id,
                name: c.name,
                status: c.status,
                reminders: c.reminders
            }))
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
