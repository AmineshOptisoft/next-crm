"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AppointmentDetails } from "@/components/appointments/appointment-details-sheet";

const AppointmentDetailsSheet = dynamic(
  () =>
    import("@/components/appointments/appointment-details-sheet").then(
      (m) => m.AppointmentDetailsSheet
    ),
  { ssr: false }
);

interface BookingItem {
  _id: string;
  orderId: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  status: string;
}

interface CompletedBookingsProps {
  bookings: BookingItem[];
  readOnly?: boolean;
  manageFromDashboard?: boolean;
}

export function CompletedBookings({
  bookings,
  readOnly = false,
  manageFromDashboard = false,
}: CompletedBookingsProps) {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetails | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpenDetails = (booking: BookingItem) => {
    const start = new Date(booking.startDateTime);
    const end = new Date(booking.endDateTime);

    const appointment: AppointmentDetails = {
      id: booking._id,
      bookingId: booking._id,
      title: `Booking #${booking.orderId}`,
      start,
      end,
      status: booking.status as any,
      bookingStatus: booking.status,
    };

    setSelectedAppointment(appointment);
    setOpen(true);
  };

  return (
    <>
      <Card className="py-4 h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col justify-center gap-2">
              <CardTitle className="text-base font-medium">
                Completed Bookings
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Showing your most recent 10 completed bookings.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/appointments">Show more</a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No completed bookings yet.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  className="w-full flex items-center justify-between text-sm text-left hover:bg-muted rounded-md px-2 py-2 transition-colors"
                  onClick={() => handleOpenDetails(booking)}
                >
                  <div>
                    <p className="font-medium">#{booking.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.endDateTime).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs capitalize px-2 py-1 rounded-full bg-muted">
                    {booking.status.replace("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAppointment && (
        <AppointmentDetailsSheet
          appointment={selectedAppointment}
          open={open}
          onOpenChange={setOpen}
          readOnly={readOnly}
          onManageBooking={
            manageFromDashboard
              ? () => router.push("/dashboard/bookings")
              : undefined
          }
          manageBookingLabel="Manage Booking"
        />
      )}
    </>
  );
}

