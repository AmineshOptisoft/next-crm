import cron from "node-cron";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import ReminderLog from "@/app/models/ReminderLog";
import { Booking } from "@/app/models/Booking";
import { personalizeEmail } from "@/lib/mail";

type ReminderUnit = "Minutes" | "Hours" | "Days";

const REMINDER_TEMPLATE_ID = "03_booking_reminder";
const WINDOW_MS = 5 * 60 * 1000; // Accept a 5-minute execution window.

let cronTaskStarted = false;

function reminderToMs(unit: ReminderUnit, value: number) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (unit === "Minutes") return value * 60 * 1000;
    if (unit === "Hours") return value * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
}

function formatBookingDateTime(value?: Date | string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function buildBookingKey(booking: any) {
    // For recurring/multi-tech slots, we may have multiple booking docs for same customer/time.
    // Use a slot key to avoid duplicate reminder sends.
    if (booking?.recurringGroupId) {
        return `${booking.recurringGroupId}::${new Date(booking.startDateTime).toISOString()}::${String(booking.contactId?._id || booking.contactId || "")}`;
    }
    return String(booking?._id || "");
}

/**
 * Process reminders for all active campaigns
 */
async function processReminders() {
    try {
        await connectDB();
        const now = new Date();
        console.log("[Reminder Cron] Starting booking reminder processing...");

        const campaigns = await EmailCampaign.find({
            status: "active",
            templateId: REMINDER_TEMPLATE_ID,
            "reminders.enabled": true,
        }).lean();

        console.log(`[Reminder Cron] Found ${campaigns.length} booking reminder campaign(s).`);

        for (const campaign of campaigns) {
            try {
                const enabledReminders = (campaign.reminders || []).filter(
                    (r: any) => r?.enabled
                );
                if (enabledReminders.length === 0) continue;

                const maxOffsetMs = enabledReminders.reduce((max: number, r: any) => {
                    const offset = reminderToMs(r.unit as ReminderUnit, Number(r.value || 0));
                    return Math.max(max, offset);
                }, 0);
                if (maxOffsetMs <= 0) continue;

                const rangeStart = new Date(now.getTime());
                const rangeEnd = new Date(now.getTime() + maxOffsetMs + WINDOW_MS);

                const bookings = await Booking.find({
                    companyId: campaign.companyId,
                    status: "unconfirmed", // Stop sending immediately after user action.
                    startDateTime: { $gte: rangeStart, $lte: rangeEnd },
                })
                    .populate("contactId", "firstName lastName email companyName")
                    .populate("serviceId", "name")
                    .populate("technicianId", "firstName lastName")
                    .lean();

                const bySlot = new Map<string, any>();
                for (const booking of bookings as any[]) {
                    const key = buildBookingKey(booking);
                    if (!key) continue;
                    if (!bySlot.has(key)) bySlot.set(key, booking);
                }

                const uniqueBookings = Array.from(bySlot.values());
                if (uniqueBookings.length === 0) continue;

                const { sendMailWithCompanyProvider } = await import("@/lib/mail");

                console.log(
                    `[Reminder Cron] Campaign "${campaign.name}" processing ${uniqueBookings.length} booking(s).`
                );

                for (const booking of uniqueBookings) {
                    const contact: any = booking.contactId;
                    if (!contact?._id || !contact?.email) continue;

                    for (const reminder of enabledReminders) {
                        const offsetMs = reminderToMs(
                            reminder.unit as ReminderUnit,
                            Number(reminder.value || 0)
                        );
                        if (offsetMs <= 0) continue;

                        const triggerAt = new Date(
                            new Date(booking.startDateTime).getTime() - offsetMs
                        );
                        // Due if trigger time has passed (and booking hasn't started yet).
                        // This avoids missing reminders when the server restarts or cron ticks drift.
                        const dueNow =
                            now.getTime() >= triggerAt.getTime() &&
                            now.getTime() < new Date(booking.startDateTime).getTime();
                        if (!dueNow) continue;

                        const alreadySent = await ReminderLog.findOne({
                            campaignId: campaign._id,
                            bookingId: booking._id,
                            contactId: contact._id,
                            reminderLabel: reminder.label,
                        }).lean();
                        if (alreadySent) continue;

                        const technician = booking.technicianId as any;
                        const technicianName = [technician?.firstName, technician?.lastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim();

                        const personalizationData = {
                            bookingId: String(booking._id),
                            campaignId: String(campaign._id),
                            booking_reference: booking.orderId || "",
                            booking_date: formatBookingDateTime(booking.startDateTime),
                            booking_status: booking.status || "",
                            service_name: (booking.serviceId as any)?.name || "Service",
                            technician_name: technicianName,
                            technitian_name: technicianName,
                            reminder_label: reminder.label,
                            reminder_unit: reminder.unit,
                            reminder_value: String(reminder.value ?? ""),
                            company_name: contact.companyName || "",
                            firstname: contact.firstName || "",
                            lastname: contact.lastName || "",
                        };

                        const subject = personalizeEmail(
                            campaign.subject || "Booking Reminder",
                            contact,
                            personalizationData
                        );
                        const html = personalizeEmail(
                            campaign.html || "",
                            contact,
                            personalizationData
                        );

                        try {
                            await sendMailWithCompanyProvider({
                                companyId: String(campaign.companyId),
                                to: contact.email,
                                subject,
                                html,
                            });

                            await ReminderLog.create({
                                campaignId: campaign._id,
                                bookingId: booking._id,
                                contactId: contact._id,
                                reminderLabel: reminder.label,
                                status: "sent",
                                companyId: campaign.companyId,
                            });

                            console.log(
                                `[Reminder Cron] SENT campaign=${campaign.name} booking=${String(
                                    booking._id
                                )} contact=${contact.email} reminder=${reminder.label}`
                            );
                        } catch (error: any) {
                            await ReminderLog.create({
                                campaignId: campaign._id,
                                bookingId: booking._id,
                                contactId: contact._id,
                                reminderLabel: reminder.label,
                                status: "failed",
                                error: error?.message || "send_failed",
                                companyId: campaign.companyId,
                            });
                            console.error(
                                `[Reminder Cron] SEND ERROR booking=${String(
                                    booking._id
                                )} contact=${contact.email} reminder=${reminder.label}:`,
                                error?.message || error
                            );
                        }
                    }
                }
            } catch (error: any) {
                console.error(`[Reminder Cron] Error processing campaign ${campaign.name}:`, error.message);
            }
        }

        console.log("[Reminder Cron] Booking reminder processing completed.");
    } catch (error: any) {
        console.error('[Reminder Cron] Fatal error:', error.message);
    }
}

/**
 * Start the reminder cron job
 */
export function startReminderCron() {
    if (cronTaskStarted) {
        console.log("[Reminder Cron] Scheduler already started.");
        return;
    }
    // Run once immediately on startup so near-due reminders are not missed.
    processReminders().catch((error: any) => {
        console.error("[Reminder Cron] Initial run failed:", error?.message || error);
    });

    cron.schedule("* * * * *", async () => {
        await processReminders();
    });
    cronTaskStarted = true;
    console.log("[Reminder Cron] Scheduler started: every minute.");
}

/**
 * Manual trigger for testing
 */
export async function triggerReminderProcessing() {
    console.log('[Reminder Cron] Manual trigger initiated');
    await processReminders();
}
