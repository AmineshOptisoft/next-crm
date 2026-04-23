import cron from "node-cron";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import ReminderLog from "@/app/models/ReminderLog";
import { Booking } from "@/app/models/Booking";
import { Company } from "@/app/models/Company";
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

function toZonedDate(value: Date | string, timeZone: string) {
    const source = value instanceof Date ? value : new Date(value);
    // Convert to the company's wall-clock time by formatting in tz and parsing back.
    return new Date(source.toLocaleString("en-US", { timeZone }));
}

function formatBookingDateTime(value?: Date | string | null, timeZone?: string) {
    if (!value) return "";
    const d = timeZone ? toZonedDate(value, timeZone) : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function injectRescheduleLinkPlaceholder(html: string) {
    const placeholder = "{{reschedule_link}}";
    if (!html) return html;
    if (html.includes(placeholder)) return html;

    const sentence =
        "If you need to reschedule or have any questions, feel free to contact us in advance.";
    const cta =
        `${sentence}<br><br>Reschedule link: <a rel="noopener" href="${placeholder}" target="_blank">Reschedule your booking</a>.`;

    if (html.includes(sentence)) {
        return html.replace(sentence, cta);
    }

    // Fallback: append CTA near the end so legacy templates still expose the link.
    const fallbackCta = `<p style="line-height: 140%;">Reschedule link: <a rel="noopener" href="${placeholder}" target="_blank">Reschedule your booking</a>.</p>`;
    if (html.includes("</body>")) {
        return html.replace("</body>", `${fallbackCta}</body>`);
    }
    return `${html}${fallbackCta}`;
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
                // Ensure referenced models are registered before populate("contactId"/"serviceId").
                await import("@/app/models/User");
                await import("@/app/models/Service");

                const company = await Company.findById(campaign.companyId)
                    .select("settings.timezone")
                    .lean();
                const companyTimeZone =
                    (company as any)?.settings?.timezone || "UTC";

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
                        const zonedNow = toZonedDate(now, companyTimeZone);
                        const zonedBookingStart = toZonedDate(
                            new Date(booking.startDateTime),
                            companyTimeZone
                        );
                        const zonedTriggerAt = new Date(
                            zonedBookingStart.getTime() - offsetMs
                        );
                        // Due if trigger time has passed (and booking hasn't started yet).
                        // This avoids missing reminders when the server restarts or cron ticks drift.
                        const dueNow =
                            zonedNow.getTime() >= zonedTriggerAt.getTime() &&
                            zonedNow.getTime() < zonedBookingStart.getTime();
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
                            booking_date: formatBookingDateTime(
                                booking.startDateTime,
                                companyTimeZone
                            ),
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
                        const reminderHtmlWithRescheduleSeed = injectRescheduleLinkPlaceholder(
                            campaign.html || ""
                        );
                        const html = personalizeEmail(
                            reminderHtmlWithRescheduleSeed,
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
                                )} contact=${contact.email} reminder=${reminder.label} tz=${companyTimeZone} trigger=${zonedTriggerAt.toISOString()}`
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
