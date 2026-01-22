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

  await connectDB();

  const filter: any = buildCompanyFilter(user);
  if (status) filter.status = status;
  if (contactId) filter.contactId = contactId;

  const invoices = await Invoice.find(filter)
    .populate("contactId", "name email company")
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

  // Generate invoice number
  const count = await Invoice.countDocuments({ companyId: user.companyId });
  const invoiceNumber = `INV-${String(count + 1).padStart(5, "0")}`;

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
