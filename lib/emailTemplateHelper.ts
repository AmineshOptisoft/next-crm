import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { sendBulkEmails } from "@/lib/sendmailhelper";

/**
 * Context-aware email sender helper
 * Sends emails based on templateId to ensure only the right emails are sent in the right context
 */

interface SendEmailsByTemplateOptions {
  companyId: string;
  templateId: string;
  recipients: string[];
  bookingMap?: Map<string, string>; // Maps email to bookingId for personalization
}

/**
 * Send emails using a specific template
 * @param options - Configuration including templateId, recipients, and company
 * @returns Result object with success status and details
 */
export async function sendEmailsByTemplate({
  companyId,
  templateId,
  recipients,
  bookingMap,
}: SendEmailsByTemplateOptions) {
  try {
    await connectDB();

    // Find the latest active email campaign with the specified templateId
    const campaign = await EmailCampaign.findOne({
      companyId,
      status: "active",
      templateId,
    }).sort({ updatedAt: -1 });

    if (!campaign) {
      return {
        success: false,
        error: `No active email campaign found for template: ${templateId}`,
      };
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: "No recipients provided",
      };
    }

    // Use the helper to send bulk emails
    const results = await sendBulkEmails(
      String(campaign._id),
      recipients,
      bookingMap
    );

    return {
      success: true,
      templateId,
      campaignId: campaign._id.toString(),
      recipientCount: recipients.length,
      results,
    };
  } catch (error: any) {
    console.error(`Error sending emails with template ${templateId}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Template ID constants for easy reference
 */
export const EMAIL_TEMPLATES = {
  WELCOME: "01_welcome_email",
  BOOKING_CONFIRMATION: "02_booking_confirmation",
  BOOKING_REMINDER: "03_booking_reminder",
  SERVICE_THANK_YOU: "04_service_thank_you",
  FOLLOW_UP_REVIEW: "05_follow_up_review",
  OFFER_DISCOUNT: "06_offer_discount",
  REENGAGEMENT: "07_reengagement_email",
  CANCELLATION_CONFIRMATION: "08_cancellation_confirmation",
  DAILY_SCHEDULE_STAFF: "09_daily_schedule_staff",
  SHIFT_REMINDER_STAFF: "10_shift_reminder_staff",
  POLICY_UPDATE_STAFF: "11_policy_update_staff",
  PAYSLIP_INFO: "12_payslip_info",
  RESET_PASSWORD: "13_reset_password",
  INVOICE: "14_invoice_email",
  ACCOUNT_CONFIRMATION: "15_account_confirmation",
  SUBSCRIPTION_RENEWAL: "16_subscription_renewal",
} as const;
