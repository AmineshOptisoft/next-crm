"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { AppointmentDetails } from "@/components/appointments/appointment-details-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface TodaysBookingsProps {
  bookings: BookingItem[];
}

export function TodaysBookings({ bookings }: TodaysBookingsProps) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetails | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpenDetails = (booking: BookingItem) => {
    const appointment: AppointmentDetails = {
      id: booking._id,
      bookingId: booking._id,
      title: `Booking #${booking.orderId}`,
      start: new Date(booking.startDateTime),
      end: new Date(booking.endDateTime),
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
      <Card className="py-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Today's Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => (
              <button
                key={booking._id}
                type="button"
                className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted transition-colors"
                onClick={() => handleOpenDetails(booking)}
              >
                <p className="text-sm font-semibold">#{booking.orderId}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.startDateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(booking.endDateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {booking.status.replaceAll("_", " ")}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAppointment && (
        <AppointmentDetailsSheet
          appointment={selectedAppointment}
          open={open}
          onOpenChange={setOpen}
          readOnly
        />
      )}
    </>
  );
}
