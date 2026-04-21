import { Booking } from "@/app/models/Booking";
import { Company } from "@/app/models/Company";
import { connectDB } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/sendmailhelper";

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

export async function sendBookingConfirmedEmailToClient(bookingId: string) {
  try {
    await connectDB();

    const booking = await Booking.findById(bookingId)
      .populate("contactId", "firstName lastName email companyName")
      .populate("serviceId", "name")
      .populate("technicianId", "firstName lastName")
      .lean();

    if (!booking) {
      return { sent: false, reason: "booking_not_found" as const };
    }

    const contact = booking.contactId as any;
    const service = booking.serviceId as any;
    const technician = booking.technicianId as any;
    const companyId = booking.companyId ? String(booking.companyId) : "";

    if (!contact?.email || !companyId) {
      return { sent: false, reason: "missing_contact_or_company" as const };
    }

    const technicianName = [technician?.firstName, technician?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const company = companyId
      ? await Company.findById(companyId).select("name logo").lean()
      : null;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const rawLogo = typeof (company as any)?.logo === "string" ? (company as any).logo : "";
    const companyLogo =
      rawLogo && rawLogo.startsWith("/") ? `${baseUrl}${rawLogo}` : rawLogo;

    const payload = {
      firstname: contact.firstName || "",
      lastname: contact.lastName || "",
      company_name: (company as any)?.name || contact.companyName || "",
      company_logo: companyLogo || "",
      service_name: service?.name || "Service",
      technician_name: technicianName,
      // Keep typo alias too, since some templates use this key.
      technitian_name: technicianName,
      booking_date: formatBookingDateTime(booking.startDateTime as any),
      booking_reference: booking.orderId || "",
      bookingId: String(booking._id),
      booking_status: booking.status || "",
    };

    const result = await sendTransactionalEmail(
      "02_booking_confirmation",
      contact.email,
      payload,
      companyId
    );

    return result;
  } catch (error: any) {
    console.error("[Booking Confirmed Email] Failed to send:", error);
    return { sent: false, error: error?.message || "unknown_error" };
  }
}
