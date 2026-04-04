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

export type TechnicianDailyAnalyticsRow = {
  technicianId: string;
  name: string;
  availabilityLabel: string;
  workingLabel: string;
  vacantLabel: string;
  bookingsCount: number;
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
    </div>
  );
}
