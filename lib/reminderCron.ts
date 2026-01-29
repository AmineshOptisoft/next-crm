import cron from "node-cron";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import ReminderLog from "@/app/models/ReminderLog";
import { User } from "@/app/models/User";

/**
 * Calculate the time difference in the specified unit
 */
function getTimeDifference(date1: Date, date2: Date, unit: 'Minutes' | 'Hours' | 'Days'): number {
    const diffMs = Math.abs(date2.getTime() - date1.getTime());

    switch (unit) {
        case 'Minutes':
            return Math.floor(diffMs / (1000 * 60));
        case 'Hours':
            return Math.floor(diffMs / (1000 * 60 * 60));
        case 'Days':
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        default:
            return 0;
    }
}

/**
 * Process reminders for all active campaigns
 */
async function processReminders() {
    try {
        await connectDB();
        console.log('[Reminder Cron] Starting reminder processing...');

        // Find all active campaigns with enabled reminders
        const campaigns = await EmailCampaign.find({
            status: 'active',
            'reminders.enabled': true,
        });

        console.log(`[Reminder Cron] Found ${campaigns.length} active campaigns with reminders`);

        for (const campaign of campaigns) {
            try {
                // Get sender details for logging
                const { getFromEmail, getMailProviderType, sendMailWithCampaignProvider } = await import("@/lib/mail");
                const fromEmail = await getFromEmail(campaign._id.toString());
                const providerType = await getMailProviderType(campaign._id.toString());

                // Get all contacts for this company (users with role='contact')
                const contacts = await User.find({
                    companyId: campaign.companyId,
                    role: 'contact',
                    email: { $exists: true, $ne: '' }
                });

                console.log(`[Reminder Cron] Campaign: "${campaign.name}" | Provider: ${providerType.toUpperCase()} | From: ${fromEmail}`);
                console.log(`[Reminder Cron] Processing ${contacts.length} contacts...`);

                for (const contact of contacts) {
                    for (const reminder of campaign.reminders) {
                        if (!reminder.enabled) continue;

                        // Check if reminder already sent
                        const alreadySent = await ReminderLog.findOne({
                            campaignId: campaign._id,
                            contactId: contact._id,
                            reminderLabel: reminder.label,
                        });

                        if (alreadySent) {
                            console.log(`[Reminder Cron]   - Skip ${contact.email} (${reminder.label}): Already sent`);
                            continue;
                        }

                        // Calculate timing
                        const now = new Date();
                        const contactCreatedAt = contact.createdAt || new Date();
                        const timeDiff = getTimeDifference(contactCreatedAt, now, reminder.unit);
                        const reminderValue = parseInt(reminder.value);

                        if (timeDiff >= reminderValue) {
                            try {
                                console.log(`[Reminder Cron] ✉️  SENDING: [${reminder.label}] From: ${fromEmail} To: ${contact.email}`);

                                let emailHtml = campaign.html;
                                emailHtml = emailHtml.replace(/\{\{firstname\}\}/gi, contact.firstName || '');
                                emailHtml = emailHtml.replace(/\{\{lastname\}\}/gi, contact.lastName || '');
                                emailHtml = emailHtml.replace(/\{\{email\}\}/gi, contact.email || '');
                                emailHtml = emailHtml.replace(/\{\{phone\}\}/gi, contact.phoneNumber || '');
                                emailHtml = emailHtml.replace(/\{\{company\}\}/gi, contact.companyName || '');

                                await sendMailWithCampaignProvider({
                                    campaignId: campaign._id.toString(),
                                    to: contact.email,
                                    subject: `${campaign.subject} - ${reminder.label}`,
                                    html: emailHtml,
                                });

                                await ReminderLog.create({
                                    campaignId: campaign._id,
                                    contactId: contact._id,
                                    reminderLabel: reminder.label,
                                    status: 'sent',
                                    companyId: campaign.companyId,
                                });

                                console.log(`[Reminder Cron] ✅ SENT SUCCESS: To ${contact.email}`);
                            } catch (error: any) {
                                console.error(`[Reminder Cron] ❌ SEND ERROR: To ${contact.email} | Reason: ${error.message}`);

                                await ReminderLog.create({
                                    campaignId: campaign._id,
                                    contactId: contact._id,
                                    reminderLabel: reminder.label,
                                    status: 'failed',
                                    error: error.message,
                                    companyId: campaign.companyId,
                                });
                            }
                        } else {
                            const waitMore = reminderValue - timeDiff;
                            console.log(`[Reminder Cron]   - Wait ${contact.email} (${reminder.label}): Need ${waitMore} more ${reminder.unit}`);
                        }
                    }
                }
            } catch (error: any) {
                console.error(`[Reminder Cron] Error processing campaign ${campaign.name}:`, error.message);
            }
        }

        console.log('[Reminder Cron] Reminder processing completed');
    } catch (error: any) {
        console.error('[Reminder Cron] Fatal error:', error.message);
    }
}

/**
 * Start the reminder cron job
 */
export function startReminderCron() {
    console.log('[Reminder Cron] Cron scheduling is currently DISABLED by user request.');
    // Automated schedule is disabled to focus on manual bulk-send endpoint.
}

/**
 * Manual trigger for testing
 */
export async function triggerReminderProcessing() {
    console.log('[Reminder Cron] Manual trigger initiated');
    await processReminders();
}
