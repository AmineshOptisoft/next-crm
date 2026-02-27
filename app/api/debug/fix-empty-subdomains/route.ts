import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";

// Simple one-off debug endpoint to clean up duplicate empty subdomain values.
// Visit /api/debug/fix-empty-subdomains once in dev to run it.
export async function GET() {
  try {
    await connectDB();

    const result = await Company.updateMany(
      { subdomain: "" },
      { $unset: { subdomain: "" } }
    );

    return NextResponse.json({
      message: "Cleared empty subdomain values",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("fix-empty-subdomains error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

