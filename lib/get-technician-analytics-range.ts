import { eachDayOfInterval, startOfDay } from "date-fns";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { Company } from "@/app/models/Company";
import { User } from "@/app/models/User";
import { Types } from "mongoose";
import {
  availabilityHoursForTechnician,
  DEFAULT_MASTER_AVAILABILITY,
  formatDurationHours,
  getLocalDayName,
  normalizeAvailabilityForAnalytics,
} from "@/lib/technician-daily-availability";

const BOOKING_STATUS_EXCLUDED_FROM_ANALYTICS = [
  "cancelled",
  "no_show",
  "deleted",
  "rejected",
] as const;

export type TechnicianAnalyticsPayload = {
  dateLabel: string;
  rows: {
    technicianId: string;
    name: string;
    availabilityLabel: string;
    workingLabel: string;
    vacantLabel: string;
    bookingsCount: number;
  }[];
  summary: {
    totalAvailableLabel: string;
    totalWorkingLabel: string;
    totalVacantLabel: string;
  };
};

function formatAnalyticsRangeLabel(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const a = from.toLocaleDateString(undefined, opts);
  const b = to.toLocaleDateString(undefined, opts);
  if (a === b) return a;
  return `${a} – ${b}`;
}

export async function getTechnicianAnalyticsForRange(
  companyId: string,
  rangeStart: Date,
  rangeEnd: Date,
  onlyTechnicianId?: string
): Promise<TechnicianAnalyticsPayload> {
  await connectDB();

  const companyObjectId = new Types.ObjectId(companyId);

  const company = await Company.findById(companyId).select("masterAvailability").lean();
  let masterAvailability = normalizeAvailabilityForAnalytics(
    (company as { masterAvailability?: unknown } | null)?.masterAvailability
  );
  if (masterAvailability.length === 0) {
    masterAvailability = [...DEFAULT_MASTER_AVAILABILITY];
  }

  const match: Record<string, unknown> = {
    companyId: companyObjectId,
    startDateTime: { $gte: rangeStart, $lte: rangeEnd },
    status: { $nin: [...BOOKING_STATUS_EXCLUDED_FROM_ANALYTICS] },
  };
  if (onlyTechnicianId) {
    match.technicianId = new Types.ObjectId(onlyTechnicianId);
  }

  const technicianFilter: Record<string, unknown> = {
    companyId: companyObjectId,
    role: { $in: ["company_user", "employee"] },
    isActive: true,
    isTechnicianActive: true,
  };
  if (onlyTechnicianId) {
    technicianFilter._id = new Types.ObjectId(onlyTechnicianId);
  }

  const techUsersRaw = await User.find(technicianFilter)
    .populate("customRoleId", "name")
    .select("firstName lastName availability defaultRoleName customRoleId")
    .lean();

  const techUsers = (techUsersRaw as any[]).filter((tech) => {
    const fullName = `${tech?.firstName || ""} ${tech?.lastName || ""}`.toLowerCase();
    const customRoleName = String(tech?.customRoleId?.name || "").toLowerCase();
    const defaultRoleName = String(tech?.defaultRoleName || "").toLowerCase();
    const isSubstitute =
      defaultRoleName === "substitute technician" ||
      customRoleName === "substitute technician" ||
      fullName.includes("substitute technician");
    return !isSubstitute;
  });

  const techIds = techUsers.map((u) => u._id.toString());
  const fromDay = startOfDay(rangeStart);
  const toDay = startOfDay(rangeEnd);
  const calendarDays = eachDayOfInterval({ start: fromDay, end: toDay });

  function totalAvailabilityHoursForTech(techAvailability: unknown): number {
    let sum = 0;
    for (const d of calendarDays) {
      sum += availabilityHoursForTechnician(masterAvailability, techAvailability, getLocalDayName(d));
    }
    return sum;
  }

  const dateLabel = formatAnalyticsRangeLabel(rangeStart, rangeEnd);

  const emptySummary = {
    totalAvailableLabel: formatDurationHours(0),
    totalWorkingLabel: formatDurationHours(0),
    totalVacantLabel: formatDurationHours(0),
  };

  if (techUsers.length === 0) {
    return { dateLabel, rows: [], summary: emptySummary };
  }

  const bookings = await Booking.find({
    ...match,
    technicianId: { $in: techIds.map((id) => new Types.ObjectId(id)) },
  })
    .select("technicianId startDateTime endDateTime")
    .lean();

  const byTech = new Map<string, { workingMs: number; count: number }>();
  for (const b of bookings) {
    const tid = String(b.technicianId);
    const ms = new Date(b.endDateTime).getTime() - new Date(b.startDateTime).getTime();
    if (ms <= 0) continue;
    const prev = byTech.get(tid) ?? { workingMs: 0, count: 0 };
    prev.workingMs += ms;
    prev.count += 1;
    byTech.set(tid, prev);
  }

  let totalAvail = 0;
  let totalWork = 0;
  let totalVacant = 0;

  const rows: TechnicianAnalyticsPayload["rows"] = [];

  for (const u of techUsers as Array<{ _id: Types.ObjectId; firstName?: string; lastName?: string; availability?: unknown }>) {
    const tid = u._id.toString();
    const name =
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Technician";
    const acc = byTech.get(tid) ?? { workingMs: 0, count: 0 };
    const workingHours = acc.workingMs / 3_600_000;
    const availabilityHours = totalAvailabilityHoursForTech(u?.availability);
    const vacantHours = Math.max(0, availabilityHours - workingHours);

    totalAvail += availabilityHours;
    totalWork += workingHours;
    totalVacant += vacantHours;

    rows.push({
      technicianId: tid,
      name,
      availabilityLabel: formatDurationHours(availabilityHours),
      workingLabel: formatDurationHours(workingHours),
      vacantLabel: formatDurationHours(vacantHours),
      bookingsCount: acc.count,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return {
    dateLabel,
    rows,
    summary: {
      totalAvailableLabel: formatDurationHours(totalAvail),
      totalWorkingLabel: formatDurationHours(totalWork),
      totalVacantLabel: formatDurationHours(totalVacant),
    },
  };
}
