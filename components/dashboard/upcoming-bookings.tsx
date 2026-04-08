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
  serviceName?: string;
  notes?: string;
  units?: number;
  addons?: string;
  bookingPrice?: number;
  bookingDiscountPrice?: number;
  bookingDiscount?: number;
  billedHours?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  assignedStaff?: string;
  preferredTechnician?: string;
  teamCleaningTime?: number;
  technicianTime?: number;
  timesheetNotes?: string;
  gpsArrivalTime?: string | Date;
  gpsDepartureTime?: string | Date;
}

interface UpcomingBookingsProps {
  bookings: BookingItem[];
  readOnly?: boolean;
  manageFromDashboard?: boolean;
}

export function UpcomingBookings({
  bookings,
  readOnly = false,
  manageFromDashboard = false,
}: UpcomingBookingsProps) {
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
      service: booking.serviceName,
      units: booking.units,
      addons: booking.addons,
      notes: booking.notes,
      bookingPrice: booking.bookingPrice,
      bookingDiscountPrice: booking.bookingDiscountPrice,
      bookingDiscount: booking.bookingDiscount,
      billedHours: booking.billedHours,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress,
      assignedStaff: booking.assignedStaff,
      preferredTechnician: booking.preferredTechnician,
      teamCleaningTime: booking.teamCleaningTime,
      technicianTime: booking.technicianTime,
      timesheetNotes: booking.timesheetNotes,
      gpsArrivalTime: booking.gpsArrivalTime
        ? new Date(booking.gpsArrivalTime).toLocaleString()
        : undefined,
      gpsDepartureTime: booking.gpsDepartureTime
        ? new Date(booking.gpsDepartureTime).toLocaleString()
        : undefined,
    };

    setSelectedAppointment(appointment);
    setOpen(true);
  };

  return (
    <>
      <Card className="py-4 max-h-screen overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col justify-center gap-2">
              <CardTitle className="text-base font-medium">
                Upcoming Bookings
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Most recent 10 bookings from today onwards.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/appointments">Load more</a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming bookings.
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
                      {new Date(booking.startDateTime).toLocaleString()}
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
