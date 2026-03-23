import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/app/models/Invoice";
import EmailCampaign from "@/app/models/EmailCampaign";
import { checkPermission, buildCompanyFilter } from "@/lib/permissions";
import { personalizeEmail, sendMailWithCompanyProvider } from "@/lib/mail";

type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved = maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

function replaceTemplateToken(content: string, token: string, value: string) {
  return content
    .replace(new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, "gi"), value)
    .replace(new RegExp(`\\[\\[\\s*${token}\\s*\\]\\]`, "gi"), value);
}

export async function POST(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("invoices", "edit");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { id } = await resolveParams(context);
  const body = await req.json();
  const { pdfBase64, pdfFileName } = body || {};

  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return NextResponse.json(
      { error: "Missing required invoice PDF payload" },
      { status: 400 }
    );
  }

  await connectDB();

  const filter = { _id: id, ...buildCompanyFilter(user) };
  const invoice = await Invoice.findOne(filter)
    .populate("contactId", "firstName lastName email company")
    .lean();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const recipientEmail = (invoice as any)?.contactId?.email;
  if (!recipientEmail) {
    return NextResponse.json(
      { error: "Contact email is missing for this invoice" },
      { status: 400 }
    );
  }

  const campaign = await EmailCampaign.findOne({
    templateId: "14_invoice_email",
    status: "active",
    $or: [{ companyId: user.companyId }, { isDefault: true }],
  })
    .sort({ isDefault: 1, updatedAt: -1 })
    .lean();

  if (!campaign) {
    return NextResponse.json(
      { error: "No active invoice email campaign found (14_invoice_email)" },
      { status: 400 }
    );
  }

  const invoiceDate = new Date((invoice as any).issueDate).toLocaleDateString();
  const totalAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (invoice as any).currency || "USD",
  }).format(Number((invoice as any).total) || 0);

  const customerName = [
    (invoice as any)?.contactId?.firstName,
    (invoice as any)?.contactId?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const placeholderData = {
    INVOICE_NUMBER: (invoice as any).invoiceNumber || "",
    INVOICE_DATE: invoiceDate,
    TOTAL_AMOUNT: totalAmount,
    INVOICE_PDF: "Attached as PDF",
    invoice_number: (invoice as any).invoiceNumber || "",
    invoice_date: invoiceDate,
    total_amount: totalAmount,
    invoice_pdf: "Attached as PDF",
  };

  let subject = String((campaign as any).subject || "Invoice");
  let html = String((campaign as any).html || "");

  for (const [token, value] of Object.entries(placeholderData)) {
    subject = replaceTemplateToken(subject, token, value);
    html = replaceTemplateToken(html, token, value);
  }

  subject = personalizeEmail(subject, (invoice as any).contactId || {}, placeholderData);
  html = personalizeEmail(
    html,
    {
      ...(invoice as any).contactId,
      companyName: (invoice as any)?.contactId?.company || "",
    },
    placeholderData
  );

  const cleanBase64 = pdfBase64.includes(",")
    ? pdfBase64.split(",")[1]
    : pdfBase64;

  const sendResult = await sendMailWithCompanyProvider({
    companyId: String(user.companyId),
    to: recipientEmail,
    subject,
    html,
    attachments: [
      {
        filename:
          pdfFileName ||
          `invoice-${(invoice as any).invoiceNumber || "document"}.pdf`,
        content: cleanBase64,
        encoding: "base64",
        contentType: "application/pdf",
      },
    ],
  });

  if ((sendResult as any)?.skipped) {
    return NextResponse.json(
      {
        error:
          (sendResult as any)?.error ||
          "Unable to send email. Company SMTP is not configured correctly.",
      },
      { status: 400 }
    );
  }

  const updatedInvoice = await Invoice.findOneAndUpdate(
    { _id: id, ...buildCompanyFilter(user) },
    { status: "sent" },
    { new: true }
  ).lean();

  return NextResponse.json({
    success: true,
    message: "Invoice sent successfully",
    invoice: updatedInvoice,
  });
}

