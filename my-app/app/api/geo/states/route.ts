import { NextRequest, NextResponse } from "next/server";

const allStates = [
  { id: "RJ", name: "Rajasthan", countryId: "IN" },
  { id: "MH", name: "Maharashtra", countryId: "IN" },
  { id: "CA", name: "California", countryId: "US" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryId = searchParams.get("countryId");
  if (!countryId) return NextResponse.json([]);
  const data = allStates.filter((s) => s.countryId === countryId);
  return NextResponse.json(data);
}
