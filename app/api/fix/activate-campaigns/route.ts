import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";

export async function GET() {
    try {
        await connectDB();

        // Find all campaigns that have at least one enabled reminder
        const result = await EmailCampaign.updateMany(
            { 'reminders.enabled': true },
            { $set: { status: 'active' } }
        );

        // Get updated campaigns
        const campaigns = await EmailCampaign.find({
            'reminders.enabled': true
        }).select('name status reminders');

        return NextResponse.json({
            success: true,
            message: `Activated ${result.modifiedCount} campaigns`,
            modifiedCount: result.modifiedCount,
            campaigns: campaigns.map(c => ({
                id: c._id,
                name: c.name,
                status: c.status,
                enabledReminders: c.reminders.filter((r: any) => r.enabled).length
            }))
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
