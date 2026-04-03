import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "contact") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { cardId } = await params;
    const targetId = String(cardId || "").trim();
    if (!targetId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    await connectDB();
    const doc = await User.findById(user.userId).select("cardDetails defaultPaymentMethod");
    if (!doc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentDefault = String((doc as any).defaultPaymentMethod || "").trim();
    if (currentDefault && currentDefault === targetId) {
      return NextResponse.json(
        { error: "Default card cannot be deleted. Please set another card as default first." },
        { status: 400 }
      );
    }

    const before = Array.isArray((doc as any).cardDetails) ? (doc as any).cardDetails.length : 0;
    (doc as any).cardDetails = ((doc as any).cardDetails || []).filter(
      (c: any) => c?._id?.toString?.() !== targetId
    );
    const after = (doc as any).cardDetails.length;

    if (before === after) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await doc.save();
    return NextResponse.json({
      success: true,
      defaultPaymentMethod: (doc as any).defaultPaymentMethod || "",
    });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
