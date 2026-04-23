import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { Company } from "@/app/models/Company";
import { User } from "@/app/models/User";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DEFAULT_MASTER_AVAILABILITY = [
  { day: "Monday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Tuesday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Wednesday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Thursday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Friday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Saturday", isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Sunday", isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
];

type AvailabilityWindow = {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

type TimeRange = { start: Date; end: Date };
type BookingForReschedule = {
  _id: mongoose.Types.ObjectId;
  technicianId: mongoose.Types.ObjectId;
  startDateTime: Date;
  endDateTime: Date;
  recurringGroupId?: string;
  status?: string;
};
type CompanyAvailabilityDoc = {
  masterAvailability?: AvailabilityWindow[];
};
type TechnicianAvailabilityDoc = {
  availability?: AvailabilityWindow[];
  isActive?: boolean;
  isTechnicianActive?: boolean;
};
type BookingTimeDoc = { startDateTime: Date; endDateTime: Date };
type TimeOffDoc = {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function parseTimeToMinutes(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getDayName(date: Date): string {
  const jsDay = date.getDay();
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return DAY_NAMES[index];
}

function normalizeAvailability(raw: unknown): AvailabilityWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const typedItem = item as Partial<AvailabilityWindow> | undefined;
      const day = String(item?.day || "").trim();
      return {
        day: day ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase() : "",
        isOpen: Boolean(typedItem?.isOpen),
        startTime: String(typedItem?.startTime || "09:00 AM"),
        endTime: String(typedItem?.endTime || "06:00 PM"),
      };
    })
    .filter((item) => DAY_NAMES.includes(item.day as (typeof DAY_NAMES)[number]));
}

function formatSlotLabel(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function combineDateAndMinutes(date: Date, minutes: number): Date {
  const next = new Date(date);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && a.end > b.start;
}

async function getBookingForContact(
  bookingId: string,
  contactId: string,
  companyId: string
) {
  return Booking.findOne({
    _id: bookingId,
    contactId: new mongoose.Types.ObjectId(contactId),
    companyId: new mongoose.Types.ObjectId(companyId),
  }).lean();
}

async function buildBlockedRanges(
  companyId: string,
  technicianId: string,
  selectedDate: Date,
  excludeBookingId?: string
): Promise<TimeRange[]> {
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const bookingFilter: Record<string, unknown> = {
    companyId: new mongoose.Types.ObjectId(companyId),
    technicianId: new mongoose.Types.ObjectId(technicianId),
    status: { $nin: ["cancelled", "rejected", "deleted", "no_show"] },
    startDateTime: { $lt: dayEnd },
    endDateTime: { $gt: dayStart },
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
  }

  const [bookings, timeOffs] = await Promise.all([
    Booking.find(bookingFilter).select("startDateTime endDateTime").lean<BookingTimeDoc[]>(),
    TechnicianTimeOff.find({
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: "APPROVED",
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart },
    })
      .select("startDate endDate startTime endTime")
      .lean<TimeOffDoc[]>(),
  ]);

  const bookingRanges: TimeRange[] = bookings
    .map((item) => ({
      start: new Date(item.startDateTime),
      end: new Date(item.endDateTime),
    }))
    .filter((range) => Number.isFinite(range.start.getTime()) && Number.isFinite(range.end.getTime()));

  const timeOffRanges: TimeRange[] = timeOffs
    .map((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      const startMin = parseTimeToMinutes(item.startTime);
      const endMin = parseTimeToMinutes(item.endTime);
      start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      return { start, end };
    })
    .filter((range) => Number.isFinite(range.start.getTime()) && Number.isFinite(range.end.getTime()));

  return [...bookingRanges, ...timeOffRanges];
}

async function getAvailableSlots(params: {
  selectedDate: Date;
  companyId: string;
  technicianId: string;
  bookingDurationMinutes: number;
  excludeBookingId?: string;
}) {
  const {
    selectedDate,
    companyId,
    technicianId,
    bookingDurationMinutes,
    excludeBookingId,
  } = params;

  const [company, technician, blockedRanges] = await Promise.all([
    Company.findById(companyId).select("masterAvailability").lean<CompanyAvailabilityDoc | null>(),
    User.findById(technicianId).select("availability isActive isTechnicianActive").lean<TechnicianAvailabilityDoc | null>(),
    buildBlockedRanges(companyId, technicianId, selectedDate, excludeBookingId),
  ]);

  if (!technician || technician.isActive === false || technician.isTechnicianActive === false) {
    return [];
  }

  let masterAvailability = normalizeAvailability(company?.masterAvailability);
  if (masterAvailability.length === 0) {
    masterAvailability = DEFAULT_MASTER_AVAILABILITY;
  }
  const technicianAvailability = normalizeAvailability(technician.availability);
  const effectiveTechnicianAvailability =
    technicianAvailability.length > 0 ? technicianAvailability : masterAvailability;

  const dayName = getDayName(selectedDate);
  const masterWindow = masterAvailability.find((item) => item.day === dayName);
  const technicianWindow = effectiveTechnicianAvailability.find((item) => item.day === dayName);

  if (!masterWindow?.isOpen || !technicianWindow?.isOpen) {
    return [];
  }

  const effectiveStart = Math.max(
    parseTimeToMinutes(masterWindow.startTime),
    parseTimeToMinutes(technicianWindow.startTime)
  );
  const effectiveEnd = Math.min(
    parseTimeToMinutes(masterWindow.endTime),
    parseTimeToMinutes(technicianWindow.endTime)
  );
  if (effectiveEnd <= effectiveStart) return [];

  const roundedStart = Math.ceil(effectiveStart / 60) * 60;
  const lastSlotStart = effectiveEnd - bookingDurationMinutes;
  if (lastSlotStart < roundedStart) return [];

  const now = new Date();
  const slots: Array<{ value: string; label: string; startDateTime: string; endDateTime: string }> = [];

  for (let minutes = roundedStart; minutes <= lastSlotStart; minutes += 60) {
    const slotStart = combineDateAndMinutes(selectedDate, minutes);
    const slotEnd = new Date(slotStart.getTime() + bookingDurationMinutes * 60_000);
    if (slotStart <= now) continue;

    const slotRange: TimeRange = { start: slotStart, end: slotEnd };
    const hasConflict = blockedRanges.some((range) => rangesOverlap(slotRange, range));
    if (hasConflict) continue;

    slots.push({
      value: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      label: formatSlotLabel(minutes),
      startDateTime: slotStart.toISOString(),
      endDateTime: slotEnd.toISOString(),
    });
  }

  return slots;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId || user.role !== "contact") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dateParam = String(req.nextUrl.searchParams.get("date") || "").trim();
    if (!dateParam) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    const selectedDate = new Date(`${dateParam}T00:00:00`);
    if (!Number.isFinite(selectedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    await connectDB();
    const { id } = await params;
    const booking = (await getBookingForContact(
      id,
      user.userId,
      user.companyId
    )) as BookingForReschedule | null;
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const durationMs =
      new Date(booking.endDateTime).getTime() -
      new Date(booking.startDateTime).getTime();
    const bookingDurationMinutes = Math.max(60, Math.round(durationMs / 60_000) || 60);

    const slots = await getAvailableSlots({
      selectedDate,
      companyId: user.companyId,
      technicianId: String(booking.technicianId),
      bookingDurationMinutes,
      excludeBookingId: String(booking._id),
    });

    return NextResponse.json({
      bookingId: String(booking._id),
      selectedDate: dateParam,
      durationMinutes: bookingDurationMinutes,
      slots,
    });
  } catch (error: unknown) {
    console.error("Failed to load reschedule slots:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load available slots") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId || user.role !== "contact") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<{ date: string; time: string }>;
    const date = String(body.date || "").trim();
    const time = String(body.time || "").trim();
    if (!date || !time) {
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }

    const selectedDate = new Date(`${date}T00:00:00`);
    if (!Number.isFinite(selectedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const nextStart = new Date(`${date}T${time}:00`);
    if (!Number.isFinite(nextStart.getTime())) {
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    }

    await connectDB();
    const { id } = await params;
    const booking = (await getBookingForContact(
      id,
      user.userId,
      user.companyId
    )) as BookingForReschedule | null;
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const status = String(booking.status || "").toLowerCase();
    if (["cancelled", "completed", "rejected", "deleted", "no_show"].includes(status)) {
      return NextResponse.json(
        { error: "Only active bookings can be rescheduled" },
        { status: 400 }
      );
    }

    const durationMs =
      new Date(booking.endDateTime).getTime() -
      new Date(booking.startDateTime).getTime();
    const bookingDurationMinutes = Math.max(60, Math.round(durationMs / 60_000) || 60);

    const slots = await getAvailableSlots({
      selectedDate,
      companyId: user.companyId,
      technicianId: String(booking.technicianId),
      bookingDurationMinutes,
      excludeBookingId: String(booking._id),
    });
    const selectedSlot = slots.find((slot) => slot.value === time);
    if (!selectedSlot) {
      return NextResponse.json(
        { error: "Selected slot is not available anymore. Please choose another one." },
        { status: 409 }
      );
    }

    const nextEnd = new Date(nextStart.getTime() + bookingDurationMinutes * 60_000);
    const updateFilter: Record<string, unknown> =
      booking.recurringGroupId && booking.startDateTime
        ? {
            recurringGroupId: booking.recurringGroupId,
            startDateTime: booking.startDateTime,
            companyId: new mongoose.Types.ObjectId(user.companyId),
          }
        : {
            _id: new mongoose.Types.ObjectId(String(booking._id)),
            companyId: new mongoose.Types.ObjectId(user.companyId),
          };

    await Booking.updateMany(updateFilter, {
      $set: {
        startDateTime: nextStart,
        endDateTime: nextEnd,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: String(booking._id),
      startDateTime: nextStart,
      endDateTime: nextEnd,
      message: "Booking rescheduled successfully",
    });
  } catch (error: unknown) {
    console.error("Failed to reschedule booking:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to reschedule booking") },
      { status: 500 }
    );
  }
}
