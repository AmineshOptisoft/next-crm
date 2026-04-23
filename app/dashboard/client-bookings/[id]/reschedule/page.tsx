"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClientBooking = {
  _id: string;
  orderId: string;
  serviceName: string;
  technicianName: string;
  status: string;
  startDateTime: string;
  endDateTime?: string;
};

type AvailabilitySlot = {
  value: string;
  label: string;
  startDateTime: string;
  endDateTime: string;
};

function toDateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function ClientBookingReschedulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = String(params?.id || "");

  const [booking, setBooking] = useState<ClientBooking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slotLoading, setSlotLoading] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingBooking(true);
        const res = await fetch(
          `/api/client/bookings?reviewBookingId=${encodeURIComponent(bookingId)}&limit=1`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load booking");
        }

        const nextBooking = Array.isArray(data?.bookings) ? data.bookings[0] : null;
        if (!cancelled) {
          setBooking(nextBooking || null);
          if (nextBooking?.startDateTime) {
            setSelectedDate(new Date(nextBooking.startDateTime));
          }
        }
      } catch (error: unknown) {
        if (!cancelled) toast.error(getErrorMessage(error, "Failed to load booking"));
      } finally {
        if (!cancelled) setLoadingBooking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!selectedDate || !bookingId) {
      setSlots([]);
      setSelectedTime("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setSlotLoading(true);
        setSelectedTime("");
        const date = toDateParam(selectedDate);
        const res = await fetch(
          `/api/client/bookings/${encodeURIComponent(bookingId)}/reschedule?date=${encodeURIComponent(date)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load available time slots");
        }
        if (!cancelled) {
          setSlots(Array.isArray(data?.slots) ? data.slots : []);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setSlots([]);
          toast.error(getErrorMessage(error, "Failed to load available time slots"));
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, bookingId]);

  const canSubmit = useMemo(
    () => Boolean(booking && selectedDate && selectedTime && !slotLoading && !submitting),
    [booking, selectedDate, selectedTime, slotLoading, submitting]
  );

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime || !bookingId) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/client/bookings/${encodeURIComponent(bookingId)}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: toDateParam(selectedDate),
          time: selectedTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to reschedule booking");
      }

      toast.success("Booking rescheduled successfully");
      router.push("/dashboard/client-bookings");
      router.refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to reschedule booking"));
    } finally {
      setSubmitting(false);
    }
  };

  const today = useMemo(() => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    return next;
  }, []);

  if (loadingBooking) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/client-bookings")}>
              Back to bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStart = new Date(booking.startDateTime);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reschedule booking #{booking.orderId || booking._id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Service:</span> {booking.serviceName}
          </p>
          <p>
            <span className="font-medium text-foreground">Technician:</span> {booking.technicianName}
          </p>
          <p>
            <span className="font-medium text-foreground">Current date/time:</span>{" "}
            {format(currentStart, "EEE, MMM d, yyyy hh:mm a")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select new date and time</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 md:flex-row">

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Choose a date</Label>
            <div className="rounded-md border p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < today}
                />
                
            </div>
          </div>

          

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/client-bookings")}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={!canSubmit}>
              {submitting ? "Rescheduling..." : "Confirm reschedule"}
            </Button>
          </div>
        </CardContent>
        <div className="space-y-2 p-4 md:p-6 w-full">
            <Label>Choose an available time slot</Label>
            <Select
              value={selectedTime}
              onValueChange={setSelectedTime}
              disabled={slotLoading || slots.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    slotLoading
                      ? "Loading time slots..."
                      : slots.length === 0
                        ? "No available slots for selected date"
                        : "Select time"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}
