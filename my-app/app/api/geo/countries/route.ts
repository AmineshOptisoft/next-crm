import { NextResponse } from "next/server";

export async function GET() {
  const data = [
    { id: "IN", name: "India" },
    { id: "US", name: "United States" },
  ];
  return NextResponse.json(data);
}
