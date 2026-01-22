"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Pencil, Trash2, XCircle } from "lucide-react";
import { EditBookingDetailsDialog } from "./edit-booking-details-dialog";

type DisplayValue = string | number | null | undefined;

export interface AppointmentDetails {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status?: "confirmed" | "unconfirmed" | "completed" | "cancelled";
  bookingStatus?: DisplayValue;

  // Appointment Details
  service?: DisplayValue;
  units?: DisplayValue;
  addons?: DisplayValue;
  notes?: DisplayValue;
  preferences?: DisplayValue;
  billingNotes?: DisplayValue;
  billedAmount?: DisplayValue;
  billedHours?: DisplayValue;
  bookingPrice?: DisplayValue;
  bookingDiscountPrice?: DisplayValue;
  bookingDiscount?: DisplayValue;
  estimatedBilledAmount?: DisplayValue;
  estimatedBilledHours?: DisplayValue;
  scheduledDuration?: DisplayValue;
  teamCleaningTime?: DisplayValue;
  technicianTime?: DisplayValue;
  timesheetNotes?: DisplayValue;
  gpsArrivalTime?: DisplayValue;
  gpsDepartureTime?: DisplayValue;

  // Customer Details
  customerName?: DisplayValue;
  customerEmail?: DisplayValue;
  customerPhone?: DisplayValue;
  customerAddress?: DisplayValue;
  familyInfo?: DisplayValue;
  parkingAccess?: DisplayValue;
  clientNotesFromTech?: DisplayValue;
  specialInstructionsFromClient?: DisplayValue;
  specialInstructionsFromAdmin?: DisplayValue;
  specialRequestFromClient?: DisplayValue;

  // Staff Details
  assignedStaff?: DisplayValue;
  preferredTechnician?: DisplayValue;
}

interface AppointmentDetailsSheetProps {
  appointment?: AppointmentDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailsSheet({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsSheetProps) {
  if (!appointment) return null;

  const [editBookingOpen, setEditBookingOpen] = useState(false);

  const renderValue = (value: DisplayValue) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const formatDateTime = (date?: Date) => {
    if (!date) return "-";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const KeyValueRow = ({ label, value }: { label: string; value: DisplayValue }) => {
    return (
      <div className="grid grid-cols-[190px_10px_1fr] gap-x-2 text-sm">
        <div className="text-foreground">{label}</div>
        <div className="text-muted-foreground">:</div>
        <div className="text-foreground break-words">{renderValue(value)}</div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
        <SheetHeader className="p-4 border-b gap-0 ">
          <SheetTitle className="">Booking Details</SheetTitle>
          <SheetDescription>
            {appointment.title}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div className="flex justify-end">
            <Button
              variant="default"
              className="w-fit"
              onClick={() => setEditBookingOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Booking Detail
            </Button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[190px_10px_1fr] gap-x-2 text-sm">
              <div className="text-foreground">Booking Status</div>
              <div className="text-muted-foreground">:</div>
              <div className="font-semibold text-primary">
                {renderValue(appointment.bookingStatus)}
              </div>
            </div>
            <KeyValueRow label="Start" value={formatDateTime(appointment.start)} />
            <KeyValueRow label="End" value={formatDateTime(appointment.end)} />
          </div>

          <div className="space-y-2">
            <KeyValueRow label="Service" value={appointment.service} />
            <KeyValueRow label="Units" value={appointment.units} />
            <KeyValueRow label="Addons" value={appointment.addons} />
            <KeyValueRow label="Appointment notes" value={appointment.notes} />
            <KeyValueRow label="Preferences" value={appointment.preferences} />
            <KeyValueRow label="Billing Notes" value={appointment.billingNotes} />
            <KeyValueRow label="Billed Amount" value={appointment.billedAmount} />
            <KeyValueRow label="Billed Hours" value={appointment.billedHours} />
            <KeyValueRow label="Booking Price" value={appointment.bookingPrice} />
            <KeyValueRow label="Booking Discount Price" value={appointment.bookingDiscountPrice} />
            <KeyValueRow label="Booking Discount" value={appointment.bookingDiscount} />
            <KeyValueRow label="Estimated Billed Amount" value={appointment.estimatedBilledAmount} />
            <KeyValueRow label="Estimated Billed Hours" value={appointment.estimatedBilledHours} />
            <KeyValueRow label="Scheduled Duration" value={appointment.scheduledDuration} />
            <KeyValueRow label="Team Cleaning Time" value={appointment.teamCleaningTime} />
            <KeyValueRow label="Technician Time" value={appointment.technicianTime} />
            <KeyValueRow label="Timesheet Notes" value={appointment.timesheetNotes} />
            <KeyValueRow label="GPS arrival time" value={appointment.gpsArrivalTime} />
            <KeyValueRow label="GPS departure time" value={appointment.gpsDepartureTime} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="default" className="w-fit">
              Edit Timesheet Detail
            </Button>
            <Button variant="default" className="w-fit">
              Edit Customer Detail
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-lg font-semibold">Customer</div>
            <div className="space-y-2">
              <KeyValueRow label="Name" value={appointment.customerName} />
              <KeyValueRow label="Email" value={appointment.customerEmail} />
              <KeyValueRow label="Phone" value={appointment.customerPhone} />
              <KeyValueRow label="Address" value={appointment.customerAddress} />
              <KeyValueRow label="Family Info" value={appointment.familyInfo} />
              <KeyValueRow label="Parking Access" value={appointment.parkingAccess} />
              <KeyValueRow label="Client notes from tech" value={appointment.clientNotesFromTech} />
              <KeyValueRow label="Special Instructions from Client" value={appointment.specialInstructionsFromClient} />
              <KeyValueRow label="Special Instructions from Admin" value={appointment.specialInstructionsFromAdmin} />
              <KeyValueRow label="Special request from client" value={appointment.specialRequestFromClient} />
              <Separator />
              <KeyValueRow label="Assigned Staff" value={appointment.assignedStaff} />
              <KeyValueRow label="Preferred Technician" value={appointment.preferredTechnician} />
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 border-t bg-muted/30">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="default" className="min-w-[120px]">
              <CreditCard className="h-4 w-4 mr-2" />
              Bill client
            </Button>
            <Button variant="secondary" className="min-w-[120px]">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
            <Button variant="outline" className="min-w-[120px]">
              <XCircle className="h-4 w-4 mr-2" />
              Unconfirm
            </Button>
            <Button variant="destructive" className="min-w-[120px]">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>

      <EditBookingDetailsDialog
        open={editBookingOpen}
        onOpenChange={setEditBookingOpen}
        appointment={appointment}
      />
    </Sheet>
  );
}
