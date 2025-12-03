import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/app/models/Invoice";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const invoice = await Invoice.findOne({ _id: id, ownerId: user.userId })
    .populate("contactId", "name email company phone")
    .populate("items.productId", "name sku")
    .lean();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  await connectDB();

  // Recalculate totals if items are updated
  if (body.items) {
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    body.items = body.items.map((item: any) => {
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

    body.subtotal = subtotal;
    body.taxAmount = taxAmount;
    body.discountAmount = discountAmount;
    body.total = subtotal + taxAmount - discountAmount;
  }

  // If marking as paid, set paidDate
  if (body.status === "paid" && !body.paidDate) {
    body.paidDate = new Date();
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, ownerId: user.userId },
    { $set: body },
    { new: true, runValidators: true }
  );

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const invoice = await Invoice.findOneAndDelete({
    _id: id,
    ownerId: user.userId,
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Invoice deleted successfully" });
}
