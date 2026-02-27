import { connectDB } from "@/lib/db";
import { sendMailWithCompanyProvider, sendMailWithEnvProvider } from "@/lib/mail";
import EmailCampaign from "@/app/models/EmailCampaign";
import nodemailer from "nodemailer";
// Helper to send bulk emails for a specific email campaign
// campaignId is the ID of the email created in Email Builder
// bookingMap is optional: maps email to bookingId for booking-specific emails
// companyIdForContext is optional: use when campaign is default (no companyId) for User lookup and EmailActivity
export async function sendBulkEmails(
  campaignId: string,
  to: string[],
  bookingMap?: Map<string, string>,
  companyIdForContext?: string
) {
  try {
    if (!Array.isArray(to) || to.length === 0) {
      return { error: "Missing required fields: to (array)" };
    }

    await connectDB();

    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      return { error: "Email campaign not found" };
    }

    if (campaign.status !== "active") {
      return { error: "Email campaign is not active" };
    }

    const { subject, html, companyId: campaignCompanyId } = campaign;
    if (!subject || !html) {
      return { error: "Email campaign missing subject or html" };
    }

    // Use context companyId when campaign is default (no companyId), else use campaign's companyId
    const companyId = companyIdForContext || (campaignCompanyId ? String(campaignCompanyId) : undefined);
    if (!companyId) {
      return { error: "Company context required for sending (campaign has no companyId and none was provided)" };
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

        if (recipientUser?._id) {
          await ReminderLog.default.create({
            campaignId: campaign._id,
            contactId: recipientUser._id,
            reminderLabel: `Bulk Send - ${new Date().toISOString().split('T')[0]}`,
            status: 'sent',
            companyId: companyId,
          });
          await EmailActivity.default.create({
            userId: recipientUser._id,
            campaignId: campaign._id,
            companyId: companyId,
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
            companyId: companyId,
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

// Helper to send a single transactional email based on templateId or campaign name
export async function sendTransactionalEmail(
  templateIdOrName: string,
  to: string,
  data: any, // Contains bookingId, user details, etc.
  companyId: string
) {
  try {
    await connectDB();

    const isTemplateId = /^\d{2}_/.test(templateIdOrName);
    const queryKey = isTemplateId ? 'templateId' : 'name';

    const mongoose = await import("mongoose");
    const companyObjectId = new mongoose.default.Types.ObjectId(companyId);

    // Prefer company-specific campaign, then fall back to default (isDefault: true)
    let campaign = await EmailCampaign.findOne({
        status: 'active',
        [queryKey]: templateIdOrName,
        $or: [
            { companyId: companyObjectId },
            { isDefault: true },
        ],
    })
        .sort({ isDefault: 1, updatedAt: -1 })
        .lean();

    if (!campaign) {
        campaign = await EmailCampaign.findOne({
            [queryKey]: templateIdOrName,
            status: 'active'
        }).sort({ updatedAt: -1 }).lean();
    }

    if (!campaign) {
      console.warn(`[Transactional Mail] No active campaign found for ${queryKey}: ${templateIdOrName}`);
      return { sent: false, error: "No active campaign found" };
    }

    const { subject, html } = campaign;
    const { personalizeEmail } = await import("@/lib/mail");
    const { sendMailWithCompanyProvider } = await import("@/lib/mail");
    const EmailActivity = await import("@/app/models/EmailActivity");
    const { User } = await import("@/app/models/User");

    // Get recipient user if exists
    const recipientUser = await User.findOne({ email: to, companyId });

    // Personalize content
    const personalizedHtml = personalizeEmail(html, recipientUser || { email: to, ...data }, {
      ...data,
      campaignId: campaign._id.toString()
    });

    // Send email
    const result = await sendMailWithCompanyProvider({
      companyId,
      to,
      subject: personalizeEmail(subject, recipientUser || { email: to, ...data }, data), // Also personalize subject
      html: personalizedHtml,
    });

    console.log(`[Transactional Mail] Sent ${templateIdOrName} to ${to}`);

    // Log activity if user exists — use context companyId (sender), not campaign.companyId (default campaigns may not have it)
    if (recipientUser?._id) {
        await EmailActivity.default.create({
            userId: recipientUser._id,
            campaignId: campaign._id,
            companyId: companyId,
            isAction: false,
        });
    }

    return { sent: true, messageId: result.messageId };

  } catch (error: any) {
    console.error(`[Transactional Mail Error] template=${templateIdOrName} to=${to}:`, error);
    return { sent: false, error: error.message };
  }
}

// Helper to send daily schedule emails to staff
export async function sendDailyScheduleEmail(
  companyId: string, 
  date: Date = new Date()
) {
  try {
    await connectDB();
    const { Booking } = await import("@/app/models/Booking");
    // Ensure User and Service models are loaded for population
    await import("@/app/models/User");
    await import("@/app/models/Service");
    
    // Build UTC date range that covers the full calendar day
    // Use UTC year/month/day from the given date to avoid timezone shifting
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay   = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    console.log(`[Daily Schedule] Fetching bookings for company ${companyId} on ${startOfDay.toISOString()} – ${endOfDay.toISOString()}`);

    // Find bookings for this company on this day
    // NOTE: 'unconfirmed' is the default status — do NOT exclude it
    const bookings = await Booking.find({
      companyId,
      startDateTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "rejected", "deleted", "no_show"] }
    })
    .populate("technicianId", "email firstName lastName")
    .populate("contactId", "firstName lastName email phoneNumber shippingAddress")
    .populate("serviceId", "name")
    .populate("addons.serviceId", "name")
    .populate("subServices.serviceId", "name")
    .sort({ startDateTime: 1 });

    if (!bookings || bookings.length === 0) {
        console.log(`[Daily Schedule] No bookings found.`);
        return { sent: 0, message: "No bookings found" };
    }

    let sentCount = 0;
    const errors: any[] = [];
    const scheduleDateStr = startOfDay.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Iterate through each booking and send an individual email
    for (const booking of bookings) {
        const technician = booking.technicianId;
        const contact = booking.contactId;

        // Skip if technician has no email
        if (!technician || !technician.email) {
            continue;
        }

        // --- Prepare Data Fields ---

        // Customer Details
        const customerName = contact ? `${contact.firstName} ${contact.lastName}` : "Guest";
        const customerEmail = contact?.email || "N/A";
        const customerPhone = contact?.phoneNumber || "N/A";
        
        let customerAddress = "No location provided";
        if (booking.shippingAddress && booking.shippingAddress.street) {
             const { street, city, state, zipCode } = booking.shippingAddress;
             customerAddress = [street, city, state, zipCode].filter(Boolean).join(", ");
        } else if (contact?.shippingAddress?.street) {
             const { street, city, state, zipCode } = contact.shippingAddress;
             customerAddress = [street, city, state, zipCode].filter(Boolean).join(", ");
        }

        // Booking Details
        const bookingStatus = booking.status;
        const serviceName = booking.serviceId?.name || "Service";
        
        // Format Sub-services (Units)
        let serviceUnits = "N/A";
        if (booking.subServices && booking.subServices.length > 0) {
            serviceUnits = booking.subServices.map((sub: any) => {
                const name = sub.serviceId?.name || "Item";
                return `${name} (x${sub.quantity})`;
            }).join(", ");
        } else {
             serviceUnits = "Standard";
        }

        // Format Add-ons
        let addonsStr = "None";
        if (booking.addons && booking.addons.length > 0) {
            addonsStr = booking.addons.map((addon: any) => {
                const name = addon.serviceId?.name || "Addon";
                return `${name} (x${addon.quantity})`;
            }).join(", ");
        }

        // Time
        const bookingTime = new Date(booking.startDateTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });

        // Notes
        const additionalNotes = booking.notes || "None";
        
        // --- Build Action URLs ---
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const bookingIdStr = booking._id.toString();
        const technicianIdStr = technician._id.toString();
        
        // Reuse existing confirm/cancel GET routes — they update status and return a styled HTML page
        const confirmUrl = `${baseUrl}/api/bookings/confirm?bookingId=${bookingIdStr}&userId=${technicianIdStr}`;
        const cancelUrl  = `${baseUrl}/api/bookings/cancel?bookingId=${bookingIdStr}&userId=${technicianIdStr}`;

        // --- Send Email ---

        console.log(`[Daily Schedule] Sending email to ${technician.email} for booking ${bookingIdStr}`);
        const result = await sendTransactionalEmail(
            "09_daily_schedule_staff",
            technician.email,
            {
                // Unique identifier for this email context (also prevents deduplication)
                bookingId: bookingIdStr,

                // Action URLs (feeds {{confirm_url}} and {{cancel_url}} in template)
                confirm_url: confirmUrl,
                cancel_url:  cancelUrl,
                
                // Technician info
                firstname: technician.firstName,
                lastname: technician.lastName,
                
                // Customer info
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                customer_address: customerAddress,
                
                // Booking info
                booking_status: bookingStatus,
                service: serviceName,
                service_units: serviceUnits,
                addons: addonsStr,
                booking_time: bookingTime,
                additional_notes: additionalNotes,

                // Helper for subject line if needed
                date: scheduleDateStr 
            },
            companyId
        );

        if (result.sent) {
            sentCount++;
        } else {
            console.error(`[Daily Schedule] Failed to send to ${technician.email}: ${result.error}`);
            errors.push({ email: technician.email, bookingId: booking._id, error: result.error });
        }
    }

    console.log(`[Daily Schedule] Processed ${bookings.length} bookings, sent ${sentCount} emails.`);
    return { sent: sentCount, errors };

  } catch (error: any) {
    console.error("[Daily Schedule Error]", error);
    return { error: error.message };
  }
}

const ACCOUNT_CONFIRMATION_TEMPLATE_ID = "15_account_confirmation";

/**
 * Send account confirmation email using template 15_account_confirmation.
 * Uses only .env SMTP (SMTP_USER, SMTP_PASS, EMAIL_FROM) — no company mail config required.
 * Used for signup verification; independent of company's mail provider.
 * If no active campaign or empty html, falls back to legacy plain verification email.
 */
export async function sendAccountConfirmationEmail(
  to: string,
  data: { token: string; firstname?: string; lastname?: string; company_name?: string }
) {
  try {
    await connectDB();

    const campaign = await EmailCampaign.findOne({
      status: "active",
      templateId: ACCOUNT_CONFIRMATION_TEMPLATE_ID,
      $or: [{ isDefault: true }, { companyId: { $exists: true, $ne: null } }],
    })
      .sort({ isDefault: 1, updatedAt: -1 })
      .lean();

    const html = campaign ? (campaign as any).html : null;
    if (!campaign || !html || typeof html !== "string" || !html.trim()) {
      console.warn("[Account Confirmation] No active campaign or empty html, using legacy verification email.");
      const { sendVerificationEmail } = await import("@/lib/mail");
      await sendVerificationEmail(to, data.token);
      return { sent: true, messageId: "legacy" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify?token=${data.token}&email=${encodeURIComponent(to)}`;
    const { personalizeEmail } = await import("@/lib/mail");

    const userLike = {
      email: to,
      firstName: data.firstname ?? "",
      lastName: data.lastname ?? "",
      companyName: data.company_name ?? "",
    };
    const fullData = { ...data, verify_url: verifyUrl };
    const personalizedHtml = personalizeEmail(html, userLike, fullData);
    const subject = (campaign as any).subject || "Confirm Your Account";

    // const result = await sendMailWithEnvProvider({
    //   to,
    //   subject,
    //   html: personalizedHtml,
    // });
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // Use true for port 465, false for port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log(`[Account Confirmation] Sent to ${to} via .env SMTP`);
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: personalizedHtml,
    });
    return { sent: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("[Account Confirmation Error]", error);
    return { sent: false, error: error.message };
  }
}

const OFF_TIME_CONFIRMATION_NAME = "off time request confirmation";
const OFF_TIME_CANCELLATION_NAME = "off time request cancellation";

/**
 * Send off-time request notification (approved / rejected) to technician.
 * Uses the company's mail provider (via sendMailWithCompanyProvider), same as daily schedule.
 * Tries to use the email-builder campaign by name; falls back to a simple HTML message if missing.
 */
export async function sendOffTimeRequestEmail(
  templateName: typeof OFF_TIME_CONFIRMATION_NAME | typeof OFF_TIME_CANCELLATION_NAME,
  to: string,
  companyId: string,
  data: {
    firstname?: string;
    lastname?: string;
    start_date?: string;
    end_date?: string;
    reason?: string;
    notes?: string;
  }
) {
  try {
    await connectDB();

    const mongoose = await import("mongoose");
    const companyObjectId = new mongoose.default.Types.ObjectId(companyId);

    // Prefer a campaign for this company with this name
    let campaign = await EmailCampaign.findOne({
      status: "active",
      name: templateName,
      companyId: companyObjectId,
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Fallback: any active campaign with this name
    if (!campaign) {
      campaign = await EmailCampaign.findOne({
        status: "active",
        name: templateName,
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    const statusLabel =
      templateName === OFF_TIME_CONFIRMATION_NAME ? "APPROVED" : "REJECTED";

    // If we have a designed campaign with HTML, use it with personalization
    if (campaign && (campaign as any).html) {
      const { personalizeEmail } = await import("@/lib/mail");
      const html = (campaign as any).html as string;
      const userLike = {
        email: to,
        firstName: data.firstname ?? "",
        lastName: data.lastname ?? "",
      };
      const personalizedHtml = personalizeEmail(html, userLike, {
        ...data,
        status: statusLabel,
      });
      const subject =
        (campaign as any).subject || `Off Time Request ${statusLabel}`;

      const result = await sendMailWithCompanyProvider({
        companyId,
        to,
        subject,
        html: personalizedHtml,
      });

      console.log(
        `[Off Time Email] Sent ${templateName} to ${to} via company provider (campaign)`
      );
      return { sent: true, messageId: result.messageId };
    }

    // Fallback: simple HTML email, still using company provider
    const subject = `Off Time Request ${statusLabel}`;
    const html = `
      <p>Hi ${data.firstname ?? ""} ${data.lastname ?? ""},</p>
      <p>Your time off request from <strong>${data.start_date ?? ""}</strong>
      to <strong>${data.end_date ?? ""}</strong> has been <strong>${statusLabel.toLowerCase()}</strong>.</p>
      <p><strong>Reason:</strong> ${data.reason ?? "Time off request"}</p>
      <p><strong>Notes:</strong> ${data.notes ?? "No notes provided"}</p>
    `;

    const result = await sendMailWithCompanyProvider({ companyId, to, subject, html });
    console.log(
      `[Off Time Email] Sent ${templateName} to ${to} via company provider (fallback)`
    );
    return { sent: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("[Off Time Email Error]", error);
    return { sent: false, error: error.message };
  }
}

