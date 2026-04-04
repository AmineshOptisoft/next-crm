import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTechnicianAnalyticsForRange } from "@/lib/get-technician-analytics-range";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "contact") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from or to" }, { status: 400 });
  }

  const rangeStart = new Date(from);
  const rangeEnd = new Date(to);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const onlyTechnicianId = user.role === "company_user" ? user.userId : undefined;

  const data = await getTechnicianAnalyticsForRange(
    user.companyId,
    rangeStart,
    rangeEnd,
    onlyTechnicianId
  );

  return NextResponse.json(data);
}
