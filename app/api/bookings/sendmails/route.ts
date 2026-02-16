import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { sendEmailsByTemplate, EMAIL_TEMPLATES } from "@/lib/emailTemplateHelper";

// POST - Send reminder emails for bookings happening today or tomorrow only
export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = new Date();

    // Define start of today (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Define end of tomorrow (23:59:59)
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    endOfTomorrow.setMilliseconds(-1); // Set to 23:59:59.999 of tomorrow

    // Find bookings for this company where startDateTime is today or tomorrow
    const bookings = await Booking.find({
      companyId: user.companyId,
      startDateTime: {
        $gte: startOfToday,
        $lt: endOfTomorrow,
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
        // Store the earliest booking for each email (for today/tomorrow)
        if (!bookingMap.has(contact.email)) {
          bookingMap.set(contact.email, booking._id.toString());
        }
      }
    }

    const emails = Array.from(emailSet);

    if (emails.length === 0) {
      return NextResponse.json({
        message: "No bookings found for today or tomorrow with customer emails.",
      });
    }

    // Use the context-aware helper to send ONLY booking reminder emails
    const result = await sendEmailsByTemplate({
      companyId: user.companyId.toString(),
      templateId: EMAIL_TEMPLATES.BOOKING_REMINDER,
      recipients: emails,
      bookingMap,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Booking reminder emails processed successfully.",
      dateRange: {
        start: startOfToday,
        end: endOfTomorrow,
        description: "Today and Tomorrow only"
      },
      totalBookingsChecked: bookings.length,
      uniqueEmailsTargeted: emails.length,
      templateUsed: EMAIL_TEMPLATES.BOOKING_REMINDER,
      results: result.results,
    });
  } catch (error: any) {
    console.error("Error sending booking reminder emails:", error);
    return NextResponse.json(
      { error: "Failed to send booking reminder emails", details: error.message },
      { status: 500 }
    );
  }
}

