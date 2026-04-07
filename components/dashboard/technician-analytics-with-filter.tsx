"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ANALYTICS_RANGE_STORAGE_KEY = "dashboard-technician-analytics-range";

function readStoredDateRange(): DateRange | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(ANALYTICS_RANGE_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    if (!parsed.from || !parsed.to) return undefined;
    const from = new Date(parsed.from);
    const to = new Date(parsed.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined;
    return { from, to };
  } catch {
    return undefined;
  }
}

function persistAppliedRange(range: DateRange | undefined) {
  if (typeof window === "undefined" || !range?.from || !range?.to) return;
  try {
    sessionStorage.setItem(
      ANALYTICS_RANGE_STORAGE_KEY,
      JSON.stringify({
        from: new Date(range.from).toISOString(),
        to: new Date(range.to).toISOString(),
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}
import useSWR from "swr";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import {
  TechnicianDailyAnalytics,
  type TechnicianDailyAnalyticsSummary,
  type TechnicianDailyAnalyticsRow,
} from "@/components/dashboard/technician-daily-analytics";
import type { TechnicianAnalyticsPayload } from "@/lib/get-technician-analytics-range";

type Props = {
  initialData: TechnicianAnalyticsPayload;
  initialFromIso: string;
  initialToIso: string;
  initialSwrKey: string;
  isTechnician?: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<TechnicianAnalyticsPayload>;
};

function buildRangeQueryKey(range: DateRange | undefined): string | null {
  if (!range?.from || !range?.to) return null;
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setHours(23, 59, 59, 999);
  const from = encodeURIComponent(start.toISOString());
  const to = encodeURIComponent(end.toISOString());
  return `/api/dashboard/technician-analytics?from=${from}&to=${to}`;
}

function todayRange(): DateRange {
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function TechnicianAnalyticsWithFilter({
  initialData,
  initialFromIso,
  initialToIso,
  initialSwrKey,
  isTechnician,
}: Props) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("today");
  const [daysUpToToday, setDaysUpToToday] = useState("7");
  const [daysStartingToday, setDaysStartingToday] = useState("7");
  const dragAnchorRef = useRef<Date | null>(null);
  const isDraggingRef = useRef(false);
  const [filterRange, setFilterRange] = useState<DateRange | undefined>(() => {
    const stored = readStoredDateRange();
    if (stored) return stored;
    return { from: new Date(initialFromIso), to: new Date(initialToIso) };
  });
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(() => {
    const stored = readStoredDateRange();
    if (stored) return stored;
    return { from: new Date(initialFromIso), to: new Date(initialToIso) };
  });

  const buildRangeFromPreset = (preset: string): DateRange => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const range: DateRange = { from: startOfToday, to: endOfToday };

    if (preset === "yesterday") {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - 1);
      range.from = d;
      range.to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    } else if (preset === "thisWeek") {
      const monday = new Date(startOfToday);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      const saturday = new Date(monday);
      saturday.setDate(saturday.getDate() + 5);
      saturday.setHours(23, 59, 59, 999);
      range.from = monday;
      range.to = saturday;
    } else if (preset === "lastWeek") {
      const thisMonday = new Date(startOfToday);
      const day = thisMonday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      thisMonday.setDate(thisMonday.getDate() + diff);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSaturday = new Date(lastMonday);
      lastSaturday.setDate(lastSaturday.getDate() + 5);
      lastSaturday.setHours(23, 59, 59, 999);
      range.from = lastMonday;
      range.to = lastSaturday;
    } else if (preset === "thisMonth") {
      range.from = new Date(now.getFullYear(), now.getMonth(), 1);
      range.to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === "lastMonth") {
      range.from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      range.to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (preset === "daysUpToToday") {
      const days = Math.max(1, Number(daysUpToToday) || 1);
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - (days - 1));
      range.from = start;
      range.to = endOfToday;
    } else if (preset === "daysStartingToday") {
      const days = Math.max(1, Number(daysStartingToday) || 1);
      const end = new Date(endOfToday);
      end.setDate(end.getDate() + (days - 1));
      end.setHours(23, 59, 59, 999);
      range.from = startOfToday;
      range.to = end;
    }
    return range;
  };

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === "custom") return;
    setFilterRange(buildRangeFromPreset(preset));
  };

  const handleApplyFilter = () => {
    const computedRange =
      selectedPreset === "daysUpToToday" || selectedPreset === "daysStartingToday"
        ? buildRangeFromPreset(selectedPreset)
        : filterRange;
    if (computedRange?.from && computedRange?.to) {
      setAppliedRange(computedRange);
      setFilterRange(computedRange);
      persistAppliedRange(computedRange);
    }
    setFilterSheetOpen(false);
  };

  const handleClearFilter = () => {
    setSelectedPreset("today");
    const t = todayRange();
    setFilterRange(t);
    setAppliedRange(t);
    persistAppliedRange(t);
    setFilterSheetOpen(false);
  };

  const normalizeDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const buildRange = (a: Date, b: Date): DateRange =>
    a.getTime() <= b.getTime() ? { from: a, to: b } : { from: b, to: a };

  const handleCalendarDayClick = (day: Date, modifiers: { disabled?: boolean }) => {
    if (modifiers.disabled) return;
    const d = normalizeDateOnly(day);
    setSelectedPreset("custom");
    setFilterRange({ from: d, to: d });
    dragAnchorRef.current = d;
    isDraggingRef.current = false;
  };

  const handleCalendarDayMouseEnter = (
    day: Date,
    modifiers: { disabled?: boolean },
    e: React.MouseEvent
  ) => {
    if (modifiers.disabled || e.buttons !== 1) return;

    const current = normalizeDateOnly(day);
    setSelectedPreset("custom");

    if (!dragAnchorRef.current) {
      dragAnchorRef.current = current;
      setFilterRange({ from: current, to: current });
      return;
    }

    isDraggingRef.current = true;
    setFilterRange(buildRange(dragAnchorRef.current, current));
  };

  useEffect(() => {
    const stopDragging = () => {
      isDraggingRef.current = false;
      dragAnchorRef.current = null;
    };
    window.addEventListener("mouseup", stopDragging);
    return () => window.removeEventListener("mouseup", stopDragging);
  }, []);

  const swrKey = buildRangeQueryKey(appliedRange);
  const { data, isLoading, error } = useSWR(swrKey, fetcher, {
    fallbackData: swrKey === initialSwrKey ? initialData : undefined,
    revalidateOnFocus: false,
  });

  const display: {
    dateLabel: string;
    summary: TechnicianDailyAnalyticsSummary;
    rows: TechnicianDailyAnalyticsRow[];
  } | null =
    data ?? (swrKey === initialSwrKey ? initialData : null);

  const emptyMessage = isTechnician
    ? "You have no bookings in the selected period."
    : undefined;

  const headerExtra = useMemo(() => {
    if (isLoading && !data) {
      return <span className="text-xs text-muted-foreground">Loading…</span>;
    }
    if (isLoading && data) {
      return <span className="text-xs text-muted-foreground">Updating…</span>;
    }
    if (error) {
      return <span className="text-xs text-destructive">Could not load analytics</span>;
    }
    return null;
  }, [error, isLoading, data]);

  const filterButton = (
    <Button
      type="button"
      variant="outline"
      className="w-full sm:w-auto"
      onClick={() => setFilterSheetOpen(true)}
    >
      <Filter className="mr-2 h-4 w-4" />
      Filter by date range
    </Button>
  );

  return (
    <div className="space-y-4">
      {!display ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Technician utilization</h2>
              <p className="text-sm text-muted-foreground">
                {error ? "Something went wrong." : "Loading analytics for your selected range…"}
              </p>
              {headerExtra ? <div className="mt-1">{headerExtra}</div> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">{filterButton}</div>
          </div>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {error ? "Could not load analytics for this range." : "Loading analytics…"}
          </div>
        </div>
      ) : (
        <TechnicianDailyAnalytics
          dateLabel={display.dateLabel}
          summary={display.summary}
          rows={display.rows}
          emptyMessage={emptyMessage}
          statusSlot={headerExtra}
          headerActions={filterButton}
        />
      )}

      <Sheet
        open={filterSheetOpen}
        onOpenChange={(open) => {
          setFilterSheetOpen(open);
          if (open && appliedRange?.from && appliedRange?.to) {
            setFilterRange(appliedRange);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Filter data</SheetTitle>
            <p className="text-sm text-muted-foreground">Choose a booking date range for technician analytics.</p>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-3">
              <p className="text-sm font-medium">Search Date</p>
              <Button
                type="button"
                variant={selectedPreset === "today" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("today")}
              >
                Today
              </Button>
              <Button
                type="button"
                variant={selectedPreset === "yesterday" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("yesterday")}
              >
                Yesterday
              </Button>
              <Button
                type="button"
                variant={selectedPreset === "thisWeek" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("thisWeek")}
              >
                This Week
              </Button>
              <Button
                type="button"
                variant={selectedPreset === "lastWeek" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("lastWeek")}
              >
                Last Week
              </Button>
              <Button
                type="button"
                variant={selectedPreset === "thisMonth" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("thisMonth")}
              >
                This Month
              </Button>
              <Button
                type="button"
                variant={selectedPreset === "lastMonth" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("lastMonth")}
              >
                Last Month
              </Button>
              <Button
                type="button"
                variant={selectedPreset === "custom" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => applyPreset("custom")}
              >
                Custom
              </Button>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-10 w-28 rounded-md border border-input bg-background px-3 text-center text-sm font-semibold text-foreground caret-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={daysUpToToday || ""}
                  placeholder="0"
                  onFocus={() => {
                    setSelectedPreset("daysUpToToday");
                    setDaysStartingToday("0");
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setDaysUpToToday(value);
                    setSelectedPreset("daysUpToToday");
                    setDaysStartingToday("0");
                    const normalized = Math.max(1, Number(value || "1"));
                    const now = new Date();
                    const startOfToday = new Date(now);
                    startOfToday.setHours(0, 0, 0, 0);
                    const endOfToday = new Date(now);
                    endOfToday.setHours(23, 59, 59, 999);
                    const start = new Date(startOfToday);
                    start.setDate(start.getDate() - (normalized - 1));
                    setFilterRange({ from: start, to: endOfToday });
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
                  }}
                />
                <span className="text-sm text-foreground">days up to today</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-10 w-28 rounded-md border border-input bg-background px-3 text-center text-sm font-semibold text-foreground caret-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={daysStartingToday || ""}
                  placeholder="0"
                  onFocus={() => {
                    setSelectedPreset("daysStartingToday");
                    setDaysUpToToday("0");
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setDaysStartingToday(value);
                    setSelectedPreset("daysStartingToday");
                    setDaysUpToToday("0");
                    const normalized = Math.max(1, Number(value || "1"));
                    const now = new Date();
                    const startOfToday = new Date(now);
                    startOfToday.setHours(0, 0, 0, 0);
                    const end = new Date(now);
                    end.setHours(23, 59, 59, 999);
                    end.setDate(end.getDate() + (normalized - 1));
                    setFilterRange({ from: startOfToday, to: end });
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
                  }}
                />
                <span className="text-sm text-foreground">days starting today</span>
              </div>
            </div>

            <div className="rounded-lg border md:col-span-9">
              <div className="flex items-center gap-2 border-b p-3">
                <Input value={filterRange?.from ? format(filterRange.from, "MMM dd, yyyy") : ""} readOnly />
                <Input value={filterRange?.to ? format(filterRange.to, "MMM dd, yyyy") : ""} readOnly />
              </div>
              <div className="flex justify-center p-2">
                <Calendar
                  mode="range"
                  selected={filterRange}
                  onSelect={(range) => {
                    setFilterRange(range);
                    if (range?.from) {
                      setSelectedPreset("custom");
                    }
                  }}
                  onDayClick={handleCalendarDayClick}
                  onDayMouseEnter={handleCalendarDayMouseEnter}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2035}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2">
            <Button type="button" onClick={handleApplyFilter}>
              Submit
            </Button>
            <Button type="button" variant="outline" onClick={handleClearFilter}>
              Clear
            </Button>
            <Button type="button" variant="destructive" onClick={() => setFilterSheetOpen(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
