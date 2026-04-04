import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/app/models/Invoice";
import { Booking } from "@/app/models/Booking";
// Register Product model so nested populate on invoice items does not throw in Mongoose 9+
import "@/app/models/Product";

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | null {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "contact") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyOid = toObjectId(user.companyId);
    const userOid = toObjectId(user.userId);
    if (!companyOid || !userOid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bookingIds = await Booking.find({
      companyId: companyOid,
      contactId: userOid,
    })
      .select("_id")
      .lean();

    const bookingIdList = bookingIds
      .map((b: any) => b?._id)
      .filter(Boolean);

    const orConditions: Record<string, unknown>[] = [
      { contactId: userOid },
      { ownerId: userOid },
    ];
    if (bookingIdList.length > 0) {
      orConditions.push({ bookingId: { $in: bookingIdList } });
    }

    // Match recurring-slot invoices (no bookingId) tied to this client's bookings
    const recurringKeys = await Booking.find({
      companyId: companyOid,
      contactId: userOid,
      recurringGroupId: { $exists: true, $nin: [null, ""] },
    })
      .select("recurringGroupId startDateTime")
      .lean();

    const seenRecurring = new Set<string>();
    for (const b of recurringKeys as any[]) {
      const rg = b?.recurringGroupId;
      const st = b?.startDateTime;
      if (!rg || !st) continue;
      const key = `${String(rg)}|${new Date(st).getTime()}`;
      if (seenRecurring.has(key)) continue;
      seenRecurring.add(key);
      orConditions.push({
        recurringGroupId: String(rg),
        bookingStartDateTime: new Date(st),
      });
    }

    const invoices = await Invoice.find({
      companyId: companyOid,
      $or: orConditions,
    })
      // Only paths that exist on User — invalid populate fields can throw under strict populate (Mongoose 9)
      .populate("contactId", "firstName lastName email companyName phoneNumber")
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
