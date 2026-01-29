import { sendMailWithCampaignProvider } from "./mail";
import EmailCampaign from "@/app/models/EmailCampaign";

/**
 * Helper to send campaign email immediately (e.g., on Booking)
 * This uses the active provider for the company automatically.
 */
export async function sendImmediateCampaign({
    targetEmail,
    campaignId,
    mergeTags = {}
}: {
    targetEmail: string;
    campaignId: string;
    mergeTags?: Record<string, string>;
}) {
    try {
        const campaign = await EmailCampaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign template not found");

        let html = campaign.html;

        // Replace custom merge tags
        Object.entries(mergeTags).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\ baby}`, 'gi');
            html = html.replace(regex, value);
        });

        // Basic replacements
        html = html.replace(/\{\{email\}\}/gi, targetEmail);

        await sendMailWithCampaignProvider({
            campaignId,
            to: targetEmail,
            subject: campaign.subject,
            html: html,
        });

        return { success: true };
    } catch (error: any) {
        console.error("[Immediate Send Error]", error.message);
        throw error;
    }
}
