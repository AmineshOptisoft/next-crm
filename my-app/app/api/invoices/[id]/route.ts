import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/app/models/Invoice";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved =
    maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const invoice = await Invoice.findOne({
    _id: id,
    companyId: user.companyId,
  })
    .populate("contactId", "name email company")
    .populate("items.productId", "name sku")
    .lean();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);
  const body = await req.json();
  const { items, status } = body;

  await connectDB();

  // Recalculate totals if items are updated
  let update: any = { ...body };
  if (items) {
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

    update.items = processedItems;
    update.subtotal = subtotal;
    update.taxAmount = taxAmount;
    update.discountAmount = discountAmount;
    update.total = total;
  }

  // Set paid date if status is being changed to paid
  if (status === "paid" && !body.paidDate) {
    update.paidDate = new Date();
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
    update,
    { new: true, runValidators: true }
  )
    .populate("contactId", "name email company")
    .populate("items.productId", "name sku")
    .lean();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const deleted = await Invoice.findOneAndDelete({
    _id: id,
    companyId: user.companyId,
  }).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Invoice deleted successfully" });
}
