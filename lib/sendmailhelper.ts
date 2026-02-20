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

// Helper to send a single transactional email based on templateId
export async function sendTransactionalEmail(
  templateId: string,
  to: string,
  data: any, // Contains bookingId, user details, etc.
  companyId: string
) {
  try {
    await connectDB();

    // Find the most recent active campaign for this template
    const campaign = await EmailCampaign.findOne({
        companyId,
        templateId,
        status: 'active'
    }).sort({ updatedAt: -1 });

    if (!campaign) {
      console.warn(`[Transactional Mail] No active campaign found for template: ${templateId}`);
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

    console.log(`[Transactional Mail] Sent ${templateId} to ${to}`);

    // Log activity if user exists
    if (recipientUser?._id) {
        await EmailActivity.default.create({
            userId: recipientUser._id,
            campaignId: campaign._id,
            companyId: campaign.companyId,
            isAction: false,
        });
    }

    return { sent: true, messageId: result.messageId };

  } catch (error: any) {
    console.error(`[Transactional Mail Error] template=${templateId} to=${to}:`, error);
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
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`[Daily Schedule] Fetching bookings for company ${companyId} on ${startOfDay.toDateString()}`);

    // Find bookings for this company on this day
    const bookings = await Booking.find({
      companyId,
      startDateTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "rejected", "deleted", "unconfirmed"] }
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
