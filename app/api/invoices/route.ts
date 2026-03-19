import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/app/models/Invoice";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission, buildCompanyFilter, validateCompanyAccess } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const permCheck = await checkPermission("invoices", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const contactId = searchParams.get("contactId");
  const recurringGroupId = searchParams.get("recurringGroupId");
  const bookingStartDateTime = searchParams.get("bookingStartDateTime");

  await connectDB();

  const filter: any = buildCompanyFilter(user);
  if (status) filter.status = status;
  if (contactId) filter.contactId = contactId;
  if (searchParams.get("bookingId")) filter.bookingId = searchParams.get("bookingId");
  if (recurringGroupId) filter.recurringGroupId = recurringGroupId;
  if (bookingStartDateTime) filter.bookingStartDateTime = new Date(bookingStartDateTime);

  const invoices = await Invoice.find(filter)
    .populate("contactId", "firstName lastName name email company")
    .populate("items.productId", "name sku")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const permCheck = await checkPermission("invoices", "create");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const body = await req.json();
  const {
    contactId,
    dealId,
    bookingId,
    recurringGroupId,
    bookingStartDateTime,
    items,
    issueDate,
    dueDate,
    notes,
    terms,
    currency,
  } = body;

  if (!contactId || !items || items.length === 0 || !issueDate || !dueDate) {
    return NextResponse.json(
      { error: "Contact, items, issue date, and due date are required" },
      { status: 400 }
    );
  }

  await connectDB();

  // For multi-tech bookings (1 doc per technician), ensure a single invoice per shared slot.
  // We treat (companyId + recurringGroupId + bookingStartDateTime) as the unique slot key.
  if (recurringGroupId && bookingStartDateTime) {
    const existing = await Invoice.findOne({
      companyId: user.companyId,
      recurringGroupId,
      bookingStartDateTime: new Date(bookingStartDateTime),
    }).lean();
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }
  }

  // Generate invoice number (collision-safe).
  // countDocuments can collide after deletions or concurrent creates.
  const baseCount = await Invoice.countDocuments({ companyId: user.companyId });
  let sequence = baseCount + 1;
  let invoiceNumber = `INV-${String(sequence).padStart(5, "0")}`;
  // Keep incrementing until we find a free number.
  // (invoiceNumber is globally unique in current schema)
  while (await Invoice.exists({ invoiceNumber })) {
    sequence += 1;
    invoiceNumber = `INV-${String(sequence).padStart(5, "0")}`;
  }

  // Calculate totals
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  const processedItems = items.map((item: any) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100;
    const itemDiscount = item.discount || 0;
    const itemTotal = itemSubtotal + itemTax - itemDiscount;

    subtotal += itemSubtotal;
    taxAmount += itemTax;
    discountAmount += itemDiscount;

    return {
      ...item,
      total: itemTotal,
    };
  });

  const total = subtotal + taxAmount - discountAmount;

  const invoice = await Invoice.create({
    companyId: user.companyId,
    ownerId: user.userId,
    invoiceNumber,
    contactId,
    dealId,
    bookingId,
    recurringGroupId,
    bookingStartDateTime: bookingStartDateTime ? new Date(bookingStartDateTime) : undefined,
    items: processedItems,
    subtotal,
    taxAmount,
    discountAmount,
    total,
    currency: currency || "USD",
    status: "draft",
    issueDate: new Date(issueDate),
    dueDate: new Date(dueDate),
    notes,
    terms,
  });

  return NextResponse.json(invoice, { status: 201 });
}
