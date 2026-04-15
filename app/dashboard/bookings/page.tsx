"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AppointmentDetailsSheet,
  type AppointmentDetails,
} from "@/components/appointments/appointment-details-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BookingRow = {
  _id: string;
  orderId?: string;
  status?: string;
  startDateTime: string;
  endDateTime?: string;
  contactId?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  technicianId?: {
    firstName?: string;
    lastName?: string;
  };
  serviceId?: {
    name?: string;
  };
  timesheet?: {
    arrivalTime?: string;
    departureTime?: string;
    cleaningTime?: number;
    drivingTime?: number;
    trainingTime?: number;
    totalTeamTime?: number;
  };
  bookingType?: string;
  recurringGroupId?: string;
  notes?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  pricing?: {
    finalAmount?: number;
    estimatedBilledAmount?: string;
    estimatedBilledHours?: string;
  };
};

export default function BookingsPage() {
  const permissions = usePermissions("appointments");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"previous" | "today" | "upcoming">(
    "today"
  );
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [manageSheetOpen, setManageSheetOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    arrivalTime: "",
    departureTime: "",
    drivingTime: "",
    trainingTime: "",
  });

  const activeRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const previousStart = new Date(startOfToday);
    previousStart.setDate(previousStart.getDate() - 7);

    const upcomingEnd = new Date(endOfToday);
    upcomingEnd.setDate(upcomingEnd.getDate() + 7);

    if (activeTab === "previous") {
      return { start: previousStart, end: startOfToday };
    }
    if (activeTab === "today") {
      return { start: startOfToday, end: endOfToday };
    }
    return { start: endOfToday, end: upcomingEnd };
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sortBy: "startDateTime",
          sortOrder: "asc",
          limit: "300",
          startDate: activeRange.start.toISOString(),
          endDate: activeRange.end.toISOString(),
        });
        const bookingsRes = await fetch(`/api/bookings?${params.toString()}`, {
          credentials: "include",
        });
        const bookingsJson = await bookingsRes.json();
        if (!cancelled) {
          setBookings(Array.isArray(bookingsJson) ? bookingsJson : []);
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBookings();
    return () => {
      cancelled = true;
    };
  }, [activeRange.start, activeRange.end]);

  const openBookingDetailSheet = async (bookingId: string) => {
    setDetailSheetOpen(true);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch booking details.");
      }
      const booking = await response.json();
      setSelectedBooking(booking);
    } catch {
      toast.error("Failed to load booking details.");
      setDetailSheetOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const toTimeValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format(date, "HH:mm");
  };

  const openManageSheet = () => {
    if (!selectedBooking) return;
    setFormValues({
      arrivalTime: toTimeValue(selectedBooking.timesheet?.arrivalTime || selectedBooking.startDateTime),
      departureTime: toTimeValue(
        selectedBooking.timesheet?.departureTime ||
          selectedBooking.endDateTime ||
          selectedBooking.startDateTime
      ),
      drivingTime:
        selectedBooking.timesheet?.drivingTime !== undefined
          ? String(selectedBooking.timesheet.drivingTime)
          : "",
      trainingTime:
        selectedBooking.timesheet?.trainingTime !== undefined
          ? String(selectedBooking.timesheet.trainingTime)
          : "",
    });
    setManageSheetOpen(true);
  };

  const cleaningTimePreview = useMemo(() => {
    if (!formValues.arrivalTime || !formValues.departureTime) return 0;
    const [arrivalHour, arrivalMinute] = formValues.arrivalTime.split(":").map(Number);
    const [departureHour, departureMinute] = formValues.departureTime.split(":").map(Number);
    const arrivalTotal = arrivalHour * 60 + arrivalMinute;
    const departureTotal = departureHour * 60 + departureMinute;
    return Math.max(0, departureTotal - arrivalTotal);
  }, [formValues.arrivalTime, formValues.departureTime]);

  const toDateTimeFromBookingDate = (timeValue: string, baseDateIso: string) => {
    const baseDate = new Date(baseDateIso);
    if (Number.isNaN(baseDate.getTime())) return null;
    const [h, m] = timeValue.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    baseDate.setHours(h, m, 0, 0);
    return baseDate.toISOString();
  };

  const handleSave = async () => {
    if (!selectedBooking) return;
    if (!formValues.arrivalTime || !formValues.departureTime) {
      toast.error("Arrival and departure times are required.");
      return;
    }

    const arrivalIso = toDateTimeFromBookingDate(formValues.arrivalTime, selectedBooking.startDateTime);
    const departureIso = toDateTimeFromBookingDate(
      formValues.departureTime,
      selectedBooking.startDateTime
    );
    if (!arrivalIso || !departureIso) {
      toast.error("Invalid arrival or departure time.");
      return;
    }

    const drivingTime = Number(formValues.drivingTime || 0);
    const trainingTime = Number(formValues.trainingTime || 0);
    if (Number.isNaN(drivingTime) || Number.isNaN(trainingTime)) {
      toast.error("Driving and training time must be valid numbers.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          timesheet: {
            ...selectedBooking.timesheet,
            arrivalTime: arrivalIso,
            departureTime: departureIso,
            cleaningTime: cleaningTimePreview,
            drivingTime,
            trainingTime,
          },
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const updated = await response.json();
      setSelectedBooking(updated);
      setBookings((prev) => prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b)));
      setManageSheetOpen(false);
      toast.success("Timesheet details saved.");
    } catch {
      toast.error("Failed to save timesheet details.");
    } finally {
      setSaving(false);
    }
  };

  const selectedAppointment = useMemo<AppointmentDetails | null>(() => {
    if (!selectedBooking) return null;

    const start = new Date(selectedBooking.startDateTime);
    const end = new Date(selectedBooking.endDateTime || selectedBooking.startDateTime);

    return {
      id: selectedBooking._id,
      bookingId: selectedBooking._id,
      title: selectedBooking.orderId || "Booking",
      start,
      end,
      bookingStatus: selectedBooking.status || "-",
      service: selectedBooking.serviceId?.name || "-",
      notes: selectedBooking.notes || "-",
      teamCleaningTime: selectedBooking.timesheet?.totalTeamTime ?? "-",
      technicianTime: selectedBooking.timesheet?.cleaningTime ?? "-",
      gpsArrivalTime: selectedBooking.timesheet?.arrivalTime
        ? format(new Date(selectedBooking.timesheet.arrivalTime), "yyyy-MM-dd HH:mm")
        : "-",
      gpsDepartureTime: selectedBooking.timesheet?.departureTime
        ? format(new Date(selectedBooking.timesheet.departureTime), "yyyy-MM-dd HH:mm")
        : "-",
      customerName:
        [selectedBooking.contactId?.firstName, selectedBooking.contactId?.lastName]
          .filter(Boolean)
          .join(" ") || "-",
      customerEmail: selectedBooking.contactId?.email || "-",
      customerAddress:
        [
          selectedBooking.shippingAddress?.street,
          selectedBooking.shippingAddress?.city,
          selectedBooking.shippingAddress?.state,
          selectedBooking.shippingAddress?.zipCode,
          selectedBooking.shippingAddress?.country,
        ]
          .filter(Boolean)
          .join(", ") || "-",
      assignedStaff:
        [selectedBooking.technicianId?.firstName, selectedBooking.technicianId?.lastName]
          .filter(Boolean)
          .join(" ") || "-",
      bookingPrice: selectedBooking.pricing?.finalAmount ?? "-",
      estimatedBilledAmount: selectedBooking.pricing?.estimatedBilledAmount ?? "-",
      estimatedBilledHours: selectedBooking.pricing?.estimatedBilledHours ?? "-",
    };
  }, [selectedBooking]);

  if (permissions.isLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!permissions.canView) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Bookings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Showing bookings for the selected time range.</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "previous" | "today" | "upcoming")
        }
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="previous">Previous</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => {
                    const start = new Date(booking.startDateTime);
                    const clientName = [
                      booking.contactId?.firstName,
                      booking.contactId?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const technicianName = [
                      booking.technicianId?.firstName,
                      booking.technicianId?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <TableRow
                        key={booking._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openBookingDetailSheet(booking._id)}
                      >
                        <TableCell>{booking.orderId || "-"}</TableCell>
                        <TableCell>
                          <div>{clientName || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.contactId?.email || ""}
                          </div>
                        </TableCell>
                        <TableCell>{technicianName || "-"}</TableCell>
                        <TableCell>{booking.serviceId?.name || "-"}</TableCell>
                        <TableCell>{format(start, "yyyy-MM-dd")}</TableCell>
                        <TableCell>{format(start, "HH:mm")}</TableCell>
                        <TableCell className="capitalize">
                          {booking.status || "unconfirmed"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {selectedAppointment && (
        <AppointmentDetailsSheet
          appointment={selectedAppointment}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          readOnly
          onManageBooking={openManageSheet}
          manageBookingLabel="Manage Booking"
        />
      )}

      <Sheet open={manageSheetOpen} onOpenChange={setManageSheetOpen}>
        <SheetContent side="right" className="sm:max-w-5xl">
          <SheetHeader>
            <SheetTitle>Manage Booking Timesheet</SheetTitle>
            <SheetDescription>Set arrival, departure, driving and training time.</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="arrival-time">Arrival time</Label>
              <Input
                id="arrival-time"
                type="time"
                value={formValues.arrivalTime}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, arrivalTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-time">Departure time</Label>
              <Input
                id="departure-time"
                type="time"
                value={formValues.departureTime}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, departureTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driving-time">Driving time</Label>
              <Input
                id="driving-time"
                type="number"
                min={0}
                placeholder="Minutes"
                value={formValues.drivingTime}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, drivingTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training-time">Training time</Label>
              <Input
                id="training-time"
                type="number"
                min={0}
                placeholder="Minutes"
                value={formValues.trainingTime}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, trainingTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cleaning-time">Cleaning time</Label>
              <Input id="cleaning-time" type="number" value={cleaningTimePreview} disabled />
              <p className="text-xs text-muted-foreground">
                Auto-calculated from arrival and departure time.
              </p>
            </div>
          </div>

          <SheetFooter className="flex flex-row justify-end items-center gap-3">
            <Button className="min-w-[100px]" variant="outline" onClick={() => setManageSheetOpen(false)} disabled={saving}>
              Close
            </Button>
            <Button className="min-w-[100px]" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
