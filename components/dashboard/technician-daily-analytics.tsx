import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Timer, Coffee } from "lucide-react";
import { formatDurationHours } from "@/lib/technician-daily-availability";

export type TechnicianDailyAnalyticsRow = {
  technicianId: string;
  name: string;
  availabilityLabel: string;
  workingLabel: string;
  vacantLabel: string;
  bookingsCount: number;
  workingHours?: number;
  vacantHours?: number;
  offHours?: number;
};

export type TechnicianDailyAnalyticsSummary = {
  totalAvailableLabel: string;
  totalWorkingLabel: string;
  totalVacantLabel: string;
};

type Props = {
  dateLabel: string;
  summary: TechnicianDailyAnalyticsSummary;
  rows: TechnicianDailyAnalyticsRow[];
  emptyMessage?: string;
  headerActions?: ReactNode;
  statusSlot?: ReactNode;
};

export function TechnicianDailyAnalytics({
  dateLabel,
  summary,
  rows,
  emptyMessage = "No technicians have bookings scheduled for this period.",
  headerActions,
  statusSlot,
}: Props) {
  const parsedHoursFromLabel = (label: string): number => {
    if (!label) return 0;
    const h = label.match(/(\d+)\s*h/i);
    const m = label.match(/(\d+)\s*m/i);
    const hours = h ? Number(h[1]) : 0;
    const mins = m ? Number(m[1]) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return 0;
    return hours + mins / 60;
  };

  const chartRows = rows.map((row) => {
    const working = row.workingHours ?? parsedHoursFromLabel(row.workingLabel);
    const vacant = row.vacantHours ?? parsedHoursFromLabel(row.vacantLabel);
    const off = row.offHours ?? 0;
    const total = Math.max(0, working + vacant + off);
    const workingPct = total > 0 ? (working / total) * 100 : 0;
    const offPct = total > 0 ? (off / total) * 100 : 0;
    const vacantPct = total > 0 ? (vacant / total) * 100 : 0;

    return {
      ...row,
      offLabel: formatDurationHours(off),
      workingPct,
      offPct,
      vacantPct,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Technician utilization</h2>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          {statusSlot ? <div className="mt-1">{statusSlot}</div> : null}
        </div>
        {headerActions ? <div className="flex shrink-0 flex-wrap gap-2">{headerActions}</div> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total available time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAvailableLabel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of scheduled availability windows for technicians listed below
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total working time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalWorkingLabel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined duration of bookings in this period (start to end)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total vacant time</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalVacantLabel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available time minus booking time (per technician, then summed)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Technicians with bookings in this period</CardTitle>
          <p className="text-sm text-muted-foreground">
            Availability is the sum of each day&apos;s window (company master hours intersected with each
            technician&apos;s schedule) across the selected range.
          </p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Availability</TableHead>
                    <TableHead className="text-right">Working time</TableHead>
                    <TableHead className="text-right">Vacant time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.technicianId}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.bookingsCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.availabilityLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.workingLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.vacantLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Technician time split</CardTitle>
          <p className="text-sm text-muted-foreground">
            Single stacked bar per technician: Working (green), Off (red), Vacant (yellow).
          </p>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-600" />
                  Working time
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
                  Off time
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-yellow-500" />
                  Vacant time
                </div>
              </div>

              <div className="space-y-3">
                {chartRows.map((row) => (
                  <div key={`chart-${row.technicianId}`} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        W: {row.workingLabel} | O: {row.offLabel} | V: {row.vacantLabel}
                      </div>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-sm border bg-muted flex">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${row.workingPct}%` }}
                        title={`Working: ${row.workingLabel}`}
                      />
                      <div
                        className="h-full bg-red-600"
                        style={{ width: `${row.offPct}%` }}
                        title={`Off: ${row.offLabel}`}
                      />
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${row.vacantPct}%` }}
                        title={`Vacant: ${row.vacantLabel}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
