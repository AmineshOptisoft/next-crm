import { NextRequest, NextResponse } from "next/server";

const allCities = [
  { id: "JPR", name: "Jaipur", stateId: "RJ" },
  { id: "UDA", name: "Udaipur", stateId: "RJ" },
  { id: "MUM", name: "Mumbai", stateId: "MH" },
  { id: "SF", name: "San Francisco", stateId: "CA" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateId = searchParams.get("stateId");
  if (!stateId) return NextResponse.json([]);
  const data = allCities.filter((c) => c.stateId === stateId);
  return NextResponse.json(data);
}
