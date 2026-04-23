import { Booking } from "@/app/models/Booking";
import { Company } from "@/app/models/Company";
import { connectDB } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/sendmailhelper";
import { readFile } from "fs/promises";
import path from "path";

type InlineAttachment = {
  filename?: string;
  content?: string | Buffer;
  contentType?: string;
  encoding?: string;
  cid?: string;
};

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

function toAbsoluteAssetUrl(raw: string, baseUrl: string) {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const cleaned = raw
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/^public\//i, "");

  return `${baseUrl.replace(/\/$/, "")}/${cleaned}`;
}

function toPublicRelativePath(raw: string) {
  return raw
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/^public\//i, "");
}

function pickBestBaseUrl(preferredBaseUrl?: string) {
  const normalizedPreferred =
    typeof preferredBaseUrl === "string" && preferredBaseUrl.trim().length > 0
      ? preferredBaseUrl.trim().replace(/\/$/, "")
      : undefined;
  const candidates = [
    normalizedPreferred,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000",
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  // Prefer a non-localhost URL so email clients can fetch assets.
  const nonLocalhost = candidates.find((value) => {
    try {
      const u = new URL(value);
      return u.hostname !== "localhost" && u.hostname !== "127.0.0.1";
    } catch {
      return false;
    }
  });

  return nonLocalhost || candidates[0];
}

export async function sendBookingConfirmedEmailToClient(
  bookingId: string,
  options?: { baseUrl?: string }
) {
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
      ? await Company.findById(companyId).select("name logo email phone").lean()
      : null;
    const baseUrl = pickBestBaseUrl(options?.baseUrl);
    const rawLogo = typeof (company as any)?.logo === "string" ? (company as any).logo : "";
    const companyLogo = toAbsoluteAssetUrl(rawLogo, baseUrl);
    const logoRelativePath = toPublicRelativePath(rawLogo);
    const logoAbsolutePath = logoRelativePath
      ? path.join(process.cwd(), "public", logoRelativePath.replace(/^uploads\//i, "uploads/"))
      : "";
    let inlineLogoAttachment: InlineAttachment | undefined;
    if (logoAbsolutePath) {
      try {
        const logoBuffer = await readFile(logoAbsolutePath);
        inlineLogoAttachment = {
          filename: path.basename(logoAbsolutePath),
          content: logoBuffer,
          cid: "company-logo-inline",
        };
      } catch (err: any) {
        console.warn("[Booking Confirmed Email] Could not read logo file for inline attachment:", {
          logoAbsolutePath,
          error: err?.message || "read_failed",
        });
      }
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(companyLogo)) {
      console.warn(
        "[Booking Confirmed Email] company_logo resolves to localhost. External mail clients cannot load this URL."
      );
    }
    const rescheduleLink = `${baseUrl}/dashboard/client-bookings/${encodeURIComponent(
      String(booking._id)
    )}/reschedule`;
    console.log("[Booking Confirmed Email] Logo debug:", {
      bookingId,
      companyId,
      rawLogo,
      baseUrl,
      preferredBaseUrl: options?.baseUrl || "",
      resolvedCompanyLogo: companyLogo,
      inlineAttachment: Boolean(inlineLogoAttachment),
      logoAbsolutePath,
      env: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
        APP_URL: process.env.APP_URL || "",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
        VERCEL_URL: process.env.VERCEL_URL || "",
      },
    });

    const payload = {
      firstname: contact.firstName || "",
      lastname: contact.lastName || "",
      company_name: (company as any)?.name || contact.companyName || "",
      company_logo: inlineLogoAttachment ? "cid:company-logo-inline" : companyLogo || "",
      service_name: service?.name || "Service",
      technician_name: technicianName,
      // Keep typo alias too, since some templates use this key.
      technitian_name: technicianName,
      booking_date: formatBookingDateTime(booking.startDateTime as any),
      booking_reference: booking.orderId || "",
      bookingId: String(booking._id),
      booking_status: booking.status || "",
      reschedule_link: rescheduleLink,
      rescheduleLink,
    };

    const result = await sendTransactionalEmail(
      "02_booking_confirmation",
      contact.email,
      payload,
      companyId,
      {
        attachments: inlineLogoAttachment ? [inlineLogoAttachment] : undefined,
      }
    );

    return result;
  } catch (error: any) {
    console.error("[Booking Confirmed Email] Failed to send:", error);
    return { sent: false, error: error?.message || "unknown_error" };
  }
}

export async function sendBookingCancellationEmailToClient(
  bookingId: string,
  options?: { baseUrl?: string; status?: "cancelled" | "rejected" }
) {
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
      ? await Company.findById(companyId).select("name logo email phone").lean()
      : null;
    const baseUrl = pickBestBaseUrl(options?.baseUrl);
    const rawLogo = typeof (company as any)?.logo === "string" ? (company as any).logo : "";
    const companyLogo = toAbsoluteAssetUrl(rawLogo, baseUrl);
    const logoRelativePath = toPublicRelativePath(rawLogo);
    const logoAbsolutePath = logoRelativePath
      ? path.join(process.cwd(), "public", logoRelativePath.replace(/^uploads\//i, "uploads/"))
      : "";

    let inlineLogoAttachment: InlineAttachment | undefined;
    if (logoAbsolutePath) {
      try {
        const logoBuffer = await readFile(logoAbsolutePath);
        inlineLogoAttachment = {
          filename: path.basename(logoAbsolutePath),
          content: logoBuffer,
          cid: "company-logo-inline",
        };
      } catch (err: any) {
        console.warn("[Booking Cancellation Email] Could not read logo file for inline attachment:", {
          logoAbsolutePath,
          error: err?.message || "read_failed",
        });
      }
    }

    const supportEmail =
      (company as any)?.email ||
      process.env.EMAIL_FROM ||
      "support@example.com";
    const supportPhone = (company as any)?.phone || "";

    const payload = {
      firstname: contact.firstName || "",
      lastname: contact.lastName || "",
      company_name: (company as any)?.name || contact.companyName || "",
      company_logo: inlineLogoAttachment ? "cid:company-logo-inline" : companyLogo || "",
      service_name: service?.name || "Service",
      technician_name: technicianName,
      technitian_name: technicianName,
      booking_date: formatBookingDateTime(booking.startDateTime as any),
      booking_reference: booking.orderId || "",
      bookingId: String(booking._id),
      booking_status: options?.status || booking.status || "",
      refund_applicable: "false",
      refund_amount: "$0.00",
      refund_timeline: "5-7 business days",
      support_email: supportEmail,
      support_phone: supportPhone,
    };

    console.log("[Booking Cancellation Email] Placeholder debug:", {
      bookingId,
      companyId,
      payload,
      inlineAttachment: Boolean(inlineLogoAttachment),
      logoAbsolutePath,
    });

    const result = await sendTransactionalEmail(
      "08_cancellation_confirmation",
      contact.email,
      payload,
      companyId,
      {
        attachments: inlineLogoAttachment ? [inlineLogoAttachment] : undefined,
      }
    );

    return result;
  } catch (error: any) {
    console.error("[Booking Cancellation Email] Failed to send:", error);
    return { sent: false, error: error?.message || "unknown_error" };
  }
}

export async function sendBookingCompletedEmailToClient(
  bookingId: string,
  options?: { baseUrl?: string }
) {
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
      ? await Company.findById(companyId).select("name logo email phone").lean()
      : null;
    const baseUrl = pickBestBaseUrl(options?.baseUrl);
    const rawLogo = typeof (company as any)?.logo === "string" ? (company as any).logo : "";
    const companyLogo = toAbsoluteAssetUrl(rawLogo, baseUrl);
    const logoRelativePath = toPublicRelativePath(rawLogo);
    const logoAbsolutePath = logoRelativePath
      ? path.join(process.cwd(), "public", logoRelativePath.replace(/^uploads\//i, "uploads/"))
      : "";

    let inlineLogoAttachment: InlineAttachment | undefined;
    if (logoAbsolutePath) {
      try {
        const logoBuffer = await readFile(logoAbsolutePath);
        inlineLogoAttachment = {
          filename: path.basename(logoAbsolutePath),
          content: logoBuffer,
          cid: "company-logo-inline",
        };
      } catch (err: any) {
        console.warn("[Booking Completed Email] Could not read logo file for inline attachment:", {
          logoAbsolutePath,
          error: err?.message || "read_failed",
        });
      }
    }

    const supportEmail =
      (company as any)?.email ||
      process.env.EMAIL_FROM ||
      "support@example.com";
    const supportPhone = (company as any)?.phone || "";

    const payload = {
      firstname: contact.firstName || "",
      lastname: contact.lastName || "",
      company_name: (company as any)?.name || contact.companyName || "",
      company_logo: inlineLogoAttachment ? "cid:company-logo-inline" : companyLogo || "",
      service_name: service?.name || "Service",
      technician_name: technicianName,
      technitian_name: technicianName,
      booking_date: formatBookingDateTime(booking.startDateTime as any),
      booking_reference: booking.orderId || "",
      bookingId: String(booking._id),
      booking_status: "completed",
      support_email: supportEmail,
      support_phone: supportPhone,
      feedback_link: `${baseUrl}/dashboard/appointments`,
      review_link: `${baseUrl}/dashboard/appointments`,
    };

    console.log("[Booking Completed Email] Placeholder debug:", {
      bookingId,
      companyId,
      payload,
      inlineAttachment: Boolean(inlineLogoAttachment),
      logoAbsolutePath,
    });

    const result = await sendTransactionalEmail(
      "04_service_thank_you",
      contact.email,
      payload,
      companyId,
      {
        attachments: inlineLogoAttachment ? [inlineLogoAttachment] : undefined,
      }
    );

    return result;
  } catch (error: any) {
    console.error("[Booking Completed Email] Failed to send:", error);
    return { sent: false, error: error?.message || "unknown_error" };
  }
}

export async function sendBookingReviewRequestEmailToClient(
  bookingId: string,
  options?: { baseUrl?: string }
) {
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
      ? await Company.findById(companyId).select("name logo email phone").lean()
      : null;
    const baseUrl = pickBestBaseUrl(options?.baseUrl);
    const rawLogo = typeof (company as any)?.logo === "string" ? (company as any).logo : "";
    const companyLogo = toAbsoluteAssetUrl(rawLogo, baseUrl);
    const logoRelativePath = toPublicRelativePath(rawLogo);
    const logoAbsolutePath = logoRelativePath
      ? path.join(process.cwd(), "public", logoRelativePath.replace(/^uploads\//i, "uploads/"))
      : "";

    let inlineLogoAttachment: InlineAttachment | undefined;
    if (logoAbsolutePath) {
      try {
        const logoBuffer = await readFile(logoAbsolutePath);
        inlineLogoAttachment = {
          filename: path.basename(logoAbsolutePath),
          content: logoBuffer,
          cid: "company-logo-inline",
        };
      } catch (err: any) {
        console.warn("[Booking Review Email] Could not read logo file for inline attachment:", {
          logoAbsolutePath,
          error: err?.message || "read_failed",
        });
      }
    }

    const supportEmail =
      (company as any)?.email ||
      process.env.EMAIL_FROM ||
      "support@example.com";
    const supportPhone = (company as any)?.phone || "";
    const reviewLink = `${baseUrl}/dashboard/client-bookings?reviewBookingId=${encodeURIComponent(
      String(booking._id)
    )}`;

    const payload = {
      firstname: contact.firstName || "",
      lastname: contact.lastName || "",
      company_name: (company as any)?.name || contact.companyName || "",
      company_logo: inlineLogoAttachment ? "cid:company-logo-inline" : companyLogo || "",
      service_name: service?.name || "Service",
      technician_name: technicianName,
      technitian_name: technicianName,
      booking_date: formatBookingDateTime(booking.startDateTime as any),
      booking_reference: booking.orderId || "",
      bookingId: String(booking._id),
      booking_status: "completed",
      support_email: supportEmail,
      support_phone: supportPhone,
      review_link: reviewLink,
      feedback_link: reviewLink,
    };

    console.log("[Booking Review Email] Placeholder debug:", {
      bookingId,
      companyId,
      payload,
      inlineAttachment: Boolean(inlineLogoAttachment),
      logoAbsolutePath,
    });

    const result = await sendTransactionalEmail(
      "05_follow_up_review",
      contact.email,
      payload,
      companyId,
      {
        attachments: inlineLogoAttachment ? [inlineLogoAttachment] : undefined,
      }
    );

    return result;
  } catch (error: any) {
    console.error("[Booking Review Email] Failed to send:", error);
    return { sent: false, error: error?.message || "unknown_error" };
  }
}

export async function sendBookingCompletionThenReviewEmailsToClient(
  bookingId: string,
  options?: { baseUrl?: string }
) {
  const completionResult = await sendBookingCompletedEmailToClient(bookingId, options);
  const reviewResult = await sendBookingReviewRequestEmailToClient(bookingId, options);
  return { completionResult, reviewResult };
}
