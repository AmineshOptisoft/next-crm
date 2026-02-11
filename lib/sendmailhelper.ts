import { connectDB } from "@/lib/db";
import { sendMailWithCompanyProvider } from "@/lib/mail";
import EmailCampaign from "@/app/models/EmailCampaign";

// Helper to send bulk emails for a specific email campaign
// campaignId is the ID of the email created in Email Builder
export async function sendBulkEmails(campaignId: string, to: string[]) {
  try {
    if (!Array.isArray(to) || to.length === 0) {
      return { error: "Missing required fields: to (array)" };
    }

    await connectDB();

    // Fetch the specific EmailCampaign by its ID
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      return { error: "Email campaign not found" };
    }

    if (campaign.status !== "active") {
      return { error: "Email campaign is not active" };
    }

    const { subject, html, companyId } = campaign;
    if (!subject || !html) {
      return { error: "Email campaign missing subject or html" };
    }

    // Send emails one by one (can be optimized for parallel sending)
    const { User } = await import("@/app/models/User");
    const { personalizeEmail } = await import("@/lib/mail");
    const results: any[] = [];

    for (const email of to) {
      try {
        // Personalize content if user exists in DB
        const recipientUser = await User.findOne({ email, companyId });
        const personalizedHtml = personalizeEmail(html, recipientUser);

        const result = await sendMailWithCompanyProvider({
          companyId: String(companyId),
          to: email,
          subject,
          html: personalizedHtml,
        });

        results.push({ email, success: true, messageId: result.messageId });
      } catch (err: any) {
        results.push({ email, success: false, error: err.message });
      }
    }

    return results;
  } catch (error: any) {
    console.error("[Bulk Mail Error]:", error);
    return error;
  }
}
