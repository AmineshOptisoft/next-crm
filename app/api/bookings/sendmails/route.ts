import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import EmailCampaign from "@/app/models/EmailCampaign";
import { sendBulkEmails } from "@/lib/sendmailhelper";

// POST - Send reminder emails for bookings happening today or tomorrow
export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = new Date();

    // Define start of today (00:00). We will include all bookings from today onwards.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all bookings for this company where startDateTime is today or in the future
    const bookings = await Booking.find({
      companyId: user.companyId,
      startDateTime: {
        $gte: startOfToday,
      },
    })
      .populate("contactId", "email")
      .lean();

    // Collect unique customer emails from bookings AND create booking map
    const emailSet = new Set<string>();
    const bookingMap = new Map<string, string>();  // email -> bookingId
    
    for (const booking of bookings as any[]) {
      const contact = booking.contactId as { email?: string } | undefined;
      if (contact?.email) {
        emailSet.add(contact.email);
        // Store the most recent booking for each email
        if (!bookingMap.has(contact.email)) {
          bookingMap.set(contact.email, booking._id.toString());
        }
      }
    }

    const emails = Array.from(emailSet);

    if (emails.length === 0) {
      return NextResponse.json({
        message: "No bookings found from today onwards with customer emails.",
      });
    }

    // Find the latest active email campaign for this company (created via Email Builder)
    const campaign = await EmailCampaign.findOne({
      companyId: user.companyId,
      status: "active",
    }).sort({ updatedAt: -1 });

    if (!campaign) {
      return NextResponse.json(
        { error: "No active email campaign found for this company" },
        { status: 400 }
      );
    }

    // Use the helper to send bulk emails with booking data
    const results = await sendBulkEmails(String(campaign._id), emails, bookingMap);

    return NextResponse.json({
      message: "Reminder emails processed.",
      dateRange: {
        today: startOfToday,
      },
      totalBookingsChecked: bookings.length,
      uniqueEmailsTargeted: emails.length,
      results,
    });
  } catch (error: any) {
    console.error("Error sending booking reminder emails:", error);
    return NextResponse.json(
      { error: "Failed to send booking reminder emails", details: error.message },
      { status: 500 }
    );
  }
}

