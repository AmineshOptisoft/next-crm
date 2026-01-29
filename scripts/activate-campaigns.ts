/**
 * Quick Fix Script - Activate All Campaigns with Reminders
 * Run this once to fix existing campaigns
 */

import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";

async function activateCampaignsWithReminders() {
    try {
        await connectDB();
        console.log("Connected to database...");

        // Find all campaigns that have at least one enabled reminder
        const campaigns = await EmailCampaign.find({
            'reminders.enabled': true
        });

        console.log(`Found ${campaigns.length} campaigns with enabled reminders`);

        // Update their status to "active"
        const result = await EmailCampaign.updateMany(
            { 'reminders.enabled': true },
            { $set: { status: 'active' } }
        );

        console.log(`✅ Updated ${result.modifiedCount} campaigns to "active" status`);

        // Show updated campaigns
        const updatedCampaigns = await EmailCampaign.find({
            'reminders.enabled': true
        }).select('name status reminders');

        console.log("\nUpdated campaigns:");
        updatedCampaigns.forEach(c => {
            const enabledReminders = c.reminders.filter((r: any) => r.enabled);
            console.log(`- ${c.name}: ${c.status} (${enabledReminders.length} enabled reminders)`);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

activateCampaignsWithReminders();
