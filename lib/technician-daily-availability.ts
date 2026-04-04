/** Aligns with `app/api/appointments/resources/route.ts` (master ∩ technician windows). */

export const ANALYTICS_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DAY_SET = new Set<string>(ANALYTICS_DAY_NAMES);

export const DEFAULT_MASTER_AVAILABILITY: {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}[] = [
  { day: "Monday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Tuesday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Wednesday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Thursday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Friday", isOpen: true, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Saturday", isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
  { day: "Sunday", isOpen: false, startTime: "09:00 AM", endTime: "06:00 PM" },
];

type NumericDay = { isOpen: boolean; startMin: number; endMin: number };

function parseTimeToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function normalizeAvailabilityForAnalytics(
  arr: unknown
): { day: string; isOpen: boolean; startTime: string; endTime: string }[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out: { day: string; isOpen: boolean; startTime: string; endTime: string }[] = [];
  for (const item of arr) {
    const raw = (item as { day?: string })?.day?.trim();
    if (!raw) continue;
    const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (!DAY_SET.has(normalized)) continue;
    out.push({
      day: normalized,
      isOpen: Boolean((item as { isOpen?: boolean }).isOpen),
      startTime: (item as { startTime?: string }).startTime || "09:00 AM",
      endTime: (item as { endTime?: string }).endTime || "06:00 PM",
    });
  }
  return out;
}

function buildNumericMap(
  availability: { day: string; isOpen: boolean; startTime: string; endTime: string }[]
): Map<string, NumericDay> {
  const map = new Map<string, NumericDay>();
  for (const a of availability) {
    map.set(a.day, {
      isOpen: a.isOpen,
      startMin: parseTimeToMinutes(a.startTime),
      endMin: parseTimeToMinutes(a.endTime),
    });
  }
  return map;
}

/** Monday-first weekday name for a local calendar date. */
export function getLocalDayName(d: Date): string {
  const jsDay = d.getDay();
  const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
  return ANALYTICS_DAY_NAMES[dayIdx];
}

/**
 * Effective working window in minutes for one day (intersection of company master and technician).
 */
export function effectiveWorkdayMinutes(
  masterMap: Map<string, NumericDay>,
  techMap: Map<string, NumericDay>,
  dayName: string
): number {
  const master = masterMap.get(dayName);
  const tech = techMap.get(dayName);
  if (!master?.isOpen || !tech?.isOpen) return 0;
  const effectiveStart = Math.max(master.startMin, tech.startMin);
  const effectiveEnd = Math.min(master.endMin, tech.endMin);
  return Math.max(0, effectiveEnd - effectiveStart);
}

export function availabilityHoursForTechnician(
  masterAvailability: { day: string; isOpen: boolean; startTime: string; endTime: string }[],
  technicianAvailability: unknown,
  dayName: string
): number {
  const masterMap = buildNumericMap(masterAvailability);
  const techNorm = normalizeAvailabilityForAnalytics(technicianAvailability);
  const effectiveNorm = techNorm.length > 0 ? techNorm : masterAvailability;
  const techMap = buildNumericMap(effectiveNorm);
  return effectiveWorkdayMinutes(masterMap, techMap, dayName) / 60;
}

/** Human-readable duration from fractional hours (e.g. 9.25 → "9h 15m"). */
export function formatDurationHours(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "0h";
  const whole = Math.floor(h);
  let mins = Math.round((h - whole) * 60);
  let w = whole;
  if (mins >= 60) {
    w += 1;
    mins -= 60;
  }
  if (mins === 0) return `${w}h`;
  if (w === 0) return `${mins}m`;
  return `${w}h ${mins}m`;
}
