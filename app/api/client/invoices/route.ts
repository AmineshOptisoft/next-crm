import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/app/models/Invoice";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "contact") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const invoices = await Invoice.find({
      companyId: user.companyId,
      contactId: user.userId,
    })
      .populate("contactId", "firstName lastName email company")
      .populate("items.productId", "name sku")
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching client invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
