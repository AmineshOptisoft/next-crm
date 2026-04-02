import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "contact") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const cardId = String(body?.cardId || "").trim();
    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    await connectDB();
    const doc = await User.findById(user.userId).select("cardDetails defaultPaymentMethod");
    if (!doc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasCard = Array.isArray((doc as any).cardDetails)
      ? (doc as any).cardDetails.some((c: any) => c?._id?.toString?.() === cardId)
      : false;

    if (!hasCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    (doc as any).defaultPaymentMethod = cardId;
    await doc.save();

    return NextResponse.json({ defaultPaymentMethod: cardId });
  } catch (error) {
    console.error("Error setting default card:", error);
    return NextResponse.json(
      { error: "Failed to set default card" },
      { status: 500 }
    );
  }
}
