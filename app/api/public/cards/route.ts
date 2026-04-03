import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId)
      .select("cardDetails defaultPaymentMethod")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cards =
      (user as any).cardDetails?.map((c: any, index: number) => ({
        id: c._id?.toString?.() ?? `card_${index}`,
        brand: c.brand || "Card",
        last4: c.last4,
        expMonth: c.expMonth,
        expYear: c.expYear,
        nameOnCard: c.nameOnCard,
      })) ?? [];

    const defaultPaymentMethod = String((user as any).defaultPaymentMethod || "").trim();

    return NextResponse.json(
      { cards, defaultPaymentMethod },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching card details:", error);
    return NextResponse.json(
      { error: "Failed to fetch card details" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, brand, last4, expMonth, expYear, nameOnCard, cardNumber } = body || {};

    if (!userId || !last4 || !expMonth || !expYear || !nameOnCard || !cardNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedNumber = String(cardNumber).replace(/\D/g, "");
    if (normalizedNumber.length !== 16) {
      return NextResponse.json(
        { error: "Card number must be 16 digits." },
        { status: 400 }
      );
    }
    const cardHash = crypto
      .createHash("sha256")
      .update(normalizedNumber)
      .digest("hex");

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingCards = (user as any).cardDetails || [];
    const isDuplicate = existingCards.some((c: any) => {
      if (c?.cardHash) return c.cardHash === cardHash;
      return (
        c?.last4 === last4 &&
        c?.expMonth === expMonth &&
        c?.expYear === expYear &&
        (c?.nameOnCard || "").trim().toLowerCase() ===
          String(nameOnCard).trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      return NextResponse.json(
        { error: "This card already exists." },
        { status: 409 }
      );
    }

    const card: any = {
      brand: brand || "Card",
      last4,
      expMonth,
      expYear,
      nameOnCard,
      cardHash,
      createdAt: new Date(),
    };

    (user as any).cardDetails = (user as any).cardDetails || [];
    (user as any).cardDetails.push(card);
    await user.save();

    const saved = (user as any).cardDetails[(user as any).cardDetails.length - 1];

    return NextResponse.json(
      {
        id: saved._id?.toString?.(),
        brand: saved.brand,
        last4: saved.last4,
        expMonth: saved.expMonth,
        expYear: saved.expYear,
        nameOnCard: saved.nameOnCard,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving card details:", error);
    return NextResponse.json(
      { error: "Failed to save card details" },
      { status: 500 }
    );
  }
}

