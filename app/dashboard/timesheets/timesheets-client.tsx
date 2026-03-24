"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const EditBookingDetailsDialog = dynamic(
  () => import("@/components/appointments/edit-booking-details-dialog").then((m) => m.EditBookingDetailsDialog),
  { ssr: false }
);

type TimesheetRow = {
  bookingId: string;
  orderId: string;
  startDateTime: string;
  endDateTime: string;
  clientName: string;
  technicianName: string;
  cleaningTime: number;
  totalTeamTime: number;
  generalTime: number;
  drivingTime: number;
  trainingTime: number;
  teamMembers: string[];
  billedHours: number;
  timesheetNotes: string;
};

type TimesheetsResponse = {
  page: number;
  limit: number;
  total: number;
  rows: TimesheetRow[];
  totals: {
    cleaningTime: number;
    totalTeamTime: number;
    generalTime: number;
    drivingTime: number;
    trainingTime: number;
    billedHours: number;
  };
};

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function TimesheetsClient() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState<string>(toDateInputValue(today));
  const [to, setTo] = useState<string>(toDateInputValue(today));
  const [technicianId, setTechnicianId] = useState<string>("all");
  const [appointmentNumber, setAppointmentNumber] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const { data: usersData } = useSWR<any[]>("/api/users?minimal=1", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const technicians = useMemo(() => {
    if (!Array.isArray(usersData)) return [];
    // Best-effort: technician candidates are those with zone or explicitly enabled timesheet/availability/booking toggles in full payload.
    // minimal=1 doesn't include those toggles, so we show all non-contact users for now.
    return usersData.map((u: any) => ({
      id: u._id?.toString?.() ?? String(u._id),
      name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Unnamed",
    }));
  }, [usersData]);

  const queryUrl = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("from", from);
    sp.set("to", to);
    sp.set("page", String(page));
    sp.set("limit", "25");
    if (technicianId && technicianId !== "all") sp.set("technicianId", technicianId);
    if (appointmentNumber.trim()) sp.set("appointmentNumber", appointmentNumber.trim());
    return `/api/timesheets?${sp.toString()}`;
  }, [from, to, page, technicianId, appointmentNumber]);

  const { data, mutate, isLoading } = useSWR<TimesheetsResponse>(queryUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const totalRows = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / (data?.limit ?? 25)));

  const onSubmit = useCallback(() => {
    setPage(1);
    mutate();
  }, [mutate]);

  const onQuickRange = useCallback(
    (days: number) => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setFrom(toDateInputValue(start));
      setTo(toDateInputValue(end));
      setPage(1);
      mutate();
    },
    [mutate]
  );

  // Display in HH.MM style (base-100 minutes), e.g. 55 min -> 0.55, 85 min -> 1.25
  const minutesToTimeHourForm = useCallback((minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
    const hoursPart = Math.floor(safeMinutes / 60);
    const minutesPart = safeMinutes % 60;
    return `${hoursPart}.${String(minutesPart).padStart(2, "0")}`;
  }, []);

  const columns = useMemo<ColumnDef<TimesheetRow>[]>(() => {
    const dt = (iso: string) => {
      try {
        return format(new Date(iso), "yyyy-MM-dd HH:mm");
      } catch {
        return iso;
      }
    };

    return [
      { accessorKey: "startDateTime", header: "Start Date/Time", cell: ({ row }) => dt(row.original.startDateTime) },
      { accessorKey: "endDateTime", header: "Stop Date/Time", cell: ({ row }) => dt(row.original.endDateTime) },
      { accessorKey: "clientName", header: "Client Name" },
      { accessorKey: "orderId", header: "Appointment #" },
      { accessorKey: "technicianName", header: "Technician Name" },
      { accessorKey: "cleaningTime", header: "Cleaning Time", cell: ({ row }) => `${minutesToTimeHourForm(Number(row.original.cleaningTime) || 0)} hrs` },
      { accessorKey: "totalTeamTime", header: "Total Team Time", cell: ({ row }) => `${minutesToTimeHourForm(Number(row.original.totalTeamTime) || 0)} hrs` },
      { accessorKey: "generalTime", header: "General Time", cell: ({ row }) => `${minutesToTimeHourForm(Number(row.original.generalTime) || 0)} hrs` },
      { accessorKey: "drivingTime", header: "Driving Time", cell: ({ row }) => `${minutesToTimeHourForm(Number(row.original.drivingTime) || 0)} hrs` },
      { accessorKey: "trainingTime", header: "Training Time", cell: ({ row }) => `${minutesToTimeHourForm(Number(row.original.trainingTime) || 0)} hrs` },
      { accessorKey: "teamMembers", header: "Team Members", cell: ({ row }) => row.original.teamMembers?.join(", ") || "-" },
      {
        accessorKey: "billedHours",
        header: "Billed Hours",
        cell: ({ row }) =>
          `${minutesToTimeHourForm(
            (Number(row.original.cleaningTime) || 0) + (Number(row.original.drivingTime) || 0)
          )} hrs`,
      },
      { accessorKey: "timesheetNotes", header: "Time Sheet Notes", cell: ({ row }) => row.original.timesheetNotes || "-" },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingBookingId(row.original.bookingId)}
          >
            Edit Timesheet
          </Button>
        ),
      },
    ];
  }, [minutesToTimeHourForm]);

  const handleExportCsv = useCallback(() => {
    try {
      const headers = [
        "Start Date/Time",
        "Stop Date/Time",
        "Client Name",
        "Appointment #",
        "Technician Name",
        "Cleaning Time",
        "Total Team Time",
        "General Time",
        "Driving Time",
        "Training Time",
        "Team Members",
        "Billed Hours",
        "Time Sheet Notes",
      ];
      const lines = [headers.join(",")];
      rows.forEach((r) => {
        const vals = [
          r.startDateTime,
          r.endDateTime,
          r.clientName,
          r.orderId,
          r.technicianName,
          String(r.cleaningTime ?? 0),
          String(r.totalTeamTime ?? 0),
          String(r.generalTime ?? 0),
          String(r.drivingTime ?? 0),
          String(r.trainingTime ?? 0),
          (r.teamMembers || []).join(" | "),
          String(r.billedHours ?? 0),
          (r.timesheetNotes || "").replaceAll("\n", " "),
        ].map((v) => `"${String(v).replaceAll('"', '""')}"`);
        lines.push(vals.join(","));
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timesheets_${from}_to_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV");
    }
  }, [rows, from, to]);

  return (
    <div className="timesheets-page no-scrollbar h-[calc(100vh-120px)] overflow-y-auto overflow-x-hidden flex flex-col gap-4 w-full max-w-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">Time Sheet</div>
          <div className="text-sm text-muted-foreground">Filter by date range, technician and appointment number.</div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => onQuickRange(7)}>This Week</Button>
          <Button size="sm" variant="outline" onClick={() => onQuickRange(14)}>Last Week</Button>
          <Button size="sm" variant="default" onClick={handleExportCsv}>Export CSV</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Technician</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Appointment Number</Label>
            <Input value={appointmentNumber} onChange={(e) => setAppointmentNumber(e.target.value)} placeholder="e.g. 706..." />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button onClick={onSubmit} disabled={isLoading}>
            Submit
          </Button>
        </div>
      </Card>

      <div className="flex-1 w-full h-fit">
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search in table..."
        tableContainerClassName="max-h-full overflow-y-auto min-w-0 w-full max-w-full"
        showFooterPagination={false}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <div className="text-xs text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        }
      />
      </div>

      {totals && (
        <Card className="p-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div><span className="text-muted-foreground">Total Cleaning:</span> <span className="font-medium">{minutesToTimeHourForm(Number(totals.cleaningTime) || 0)} hrs</span></div>
            <div><span className="text-muted-foreground">Total Team:</span> <span className="font-medium">{minutesToTimeHourForm(Number(totals.totalTeamTime) || 0)} hrs</span></div>
            <div><span className="text-muted-foreground">General:</span> <span className="font-medium">{minutesToTimeHourForm(Number(totals.generalTime) || 0)} hrs</span></div>
            <div><span className="text-muted-foreground">Driving:</span> <span className="font-medium">{minutesToTimeHourForm(Number(totals.drivingTime) || 0)} hrs</span></div>
            <div><span className="text-muted-foreground">Training:</span> <span className="font-medium">{minutesToTimeHourForm(Number(totals.trainingTime) || 0)} hrs</span></div>
            <div><span className="text-muted-foreground">Billed Hours:</span> <span className="font-medium">{minutesToTimeHourForm((Number(totals.cleaningTime) || 0) + (Number(totals.drivingTime) || 0))} hrs</span></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Totals are for the current page.</div>
        </Card>
      )}

      {editingBookingId && (
        <EditBookingDetailsDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setEditingBookingId(null);
          }}
          appointment={{
            id: `booking-${editingBookingId}`,
            bookingId: editingBookingId,
            title: "Edit timesheet",
            start: new Date(),
            end: new Date(),
          }}
        />
      )}
    </div>
  );
}

