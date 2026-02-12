import { connectDB } from "@/lib/db";
import { sendMailWithCompanyProvider } from "@/lib/mail";
import EmailCampaign from "@/app/models/EmailCampaign";

// Helper to send bulk emails for a specific email campaign
// campaignId is the ID of the email created in Email Builder
// bookingMap is optional: maps email to bookingId for booking-specific emails
export async function sendBulkEmails(
  campaignId: string, 
  to: string[], 
  bookingMap?: Map<string, string>
) {
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
    const ReminderLog = await import("@/app/models/ReminderLog");
    const EmailActivity = await import("@/app/models/EmailActivity");
    const results: any[] = [];

    for (const email of to) {
      try {
        // Personalize content if user exists in DB
        const recipientUser = await User.findOne({ email, companyId });
        
        // Get bookingId from map if provided
        const bookingId = bookingMap?.get(email);
        
        // Personalize with booking data
        const personalizedHtml = personalizeEmail(html, recipientUser, {
          bookingId,
          campaignId: campaign._id.toString()
        });

        const result = await sendMailWithCompanyProvider({
          companyId: String(companyId),
          to: email,
          subject,
          html: personalizedHtml,
        });

        // Create ReminderLog entry for successful send
        if (recipientUser?._id) {
          await ReminderLog.default.create({
            campaignId: campaign._id,
            contactId: recipientUser._id,
            reminderLabel: `Bulk Send - ${new Date().toISOString().split('T')[0]}`,
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

          console.log(`[Bulk Mail] ✅ ReminderLog & EmailActivity created for ${email}${bookingId ? ` (Booking: ${bookingId})` : ''}`);
        }

        results.push({ email, success: true, messageId: result.messageId, bookingId });
      } catch (err: any) {
        // Log failed send attempt
        const recipientUser = await User.findOne({ email, companyId });
        if (recipientUser?._id) {
          await ReminderLog.default.create({
            campaignId: campaign._id,
            contactId: recipientUser._id,
            reminderLabel: `Bulk Send - ${new Date().toISOString().split('T')[0]}`,
            status: 'failed',
            error: err.message,
            companyId: campaign.companyId,
          });
        }
        results.push({ email, success: false, error: err.message });
      }
    }

    return results;
  } catch (error: any) {
    console.error("[Bulk Mail Error]:", error);
    return error;
  }
}
