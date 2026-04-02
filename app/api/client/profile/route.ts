import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "contact") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const profile = await User.findById(user.userId)
      .select(
        "firstName lastName email phoneNumber address country state city zipCode specialInstructions avatarUrl cardDetails defaultPaymentMethod"
      )
      .lean();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

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
    await connectDB();

    const payload = {
      firstName: String(body.firstName || "").trim(),
      lastName: String(body.lastName || "").trim(),
      phoneNumber: String(body.phoneNumber || "").trim(),
      address: String(body.address || "").trim(),
      country: String(body.country || "").trim(),
      state: String(body.state || "").trim(),
      city: String(body.city || "").trim(),
      zipCode: String(body.zipCode || "").trim(),
      specialInstructions: String(body.specialInstructions || "").trim(),
    };

    const updated = await User.findByIdAndUpdate(user.userId, payload, {
      new: true,
      runValidators: true,
    })
      .select(
        "firstName lastName email phoneNumber address country state city zipCode specialInstructions avatarUrl cardDetails defaultPaymentMethod"
      )
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating client profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
