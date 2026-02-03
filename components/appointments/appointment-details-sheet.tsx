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
import { CheckCircle, CreditCard, Pencil, Trash2, XCircle, FileText, DollarSign, Archive } from "lucide-react";
import { EditBookingDetailsDialog } from "./edit-booking-details-dialog";
import { BillClientModal } from "./bill-client-modal";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type DisplayValue = string | number | null | undefined;

export interface AppointmentDetails {
  id: string;
  bookingId?: string;
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
  onUpdate?: () => void;
}

export function AppointmentDetailsSheet({
  appointment,
  open,
  onOpenChange,
  onUpdate,
}: AppointmentDetailsSheetProps) {
  if (!appointment) return null;

  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings/${appointment.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Booking status updated to ${newStatus.replace("_", " ")}`);
      onOpenChange(false);
      onUpdate?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this booking?")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/bookings/${appointment.bookingId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete booking");

      toast.success("Booking deleted successfully");
      onOpenChange(false);
      onUpdate?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete booking");
    } finally {
      setLoading(false);
    }
  };

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
            {/* Always Visible: Bill Client (unless already invoiced/paid/closed maybe? User said ALWAYS) */}
            {appointment.bookingStatus !== "paid" &&
              appointment.bookingStatus !== "closed" &&
              appointment.bookingStatus !== "cancelled" &&
              appointment.bookingStatus !== "rejected" && (
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => setIsBillingModalOpen(true)}
                  disabled={loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bill client
                </Button>
              )}

            {/* Unconfirmed State */}
            {appointment.bookingStatus === "unconfirmed" && (
              <>
                <Button
                  variant="default"
                  className="min-w-[120px] bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusUpdate("confirmed")}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button
                  variant="destructive"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {/* Confirmed / Scheduled State */}
            {(appointment.bookingStatus === "confirmed" || appointment.bookingStatus === "scheduled") && (
              <>
                <Button
                  variant="secondary"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
                <Button
                  variant="destructive"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("cancelled")}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}

            {/* Completed State */}
            {appointment.bookingStatus === "completed" && (
              <Button
                variant="outline"
                className="min-w-[120px]"
                onClick={() => handleStatusUpdate("confirmed")} // Reopen? or just show label
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Re-open
              </Button>
            )}

            {/* Cancelled State */}
            {(appointment.bookingStatus === "cancelled" || appointment.bookingStatus === "rejected") && (
              <Button
                variant="destructive"
                className="min-w-[120px]"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            )}

            {/* Invoice Sent State */}
            {appointment.bookingStatus === "invoice_sent" && (
              <>
                <Button
                  variant="default"
                  className="min-w-[120px] bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusUpdate("paid")}
                  disabled={loading}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Payment Confirmed
                </Button>
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("confirmed")}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Undo Invoice
                </Button>
              </>
            )}

            {/* Paid State */}
            {appointment.bookingStatus === "paid" && (
              <>
                <Button
                  variant="default"
                  className="min-w-[120px] bg-gray-600 hover:bg-gray-700"
                  onClick={() => handleStatusUpdate("closed")}
                  disabled={loading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Close Booking
                </Button>
              </>
            )}

            {/* Closed State */}
            {appointment.bookingStatus === "closed" && (
              <Button
                variant="destructive"
                className="min-w-[120px]"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            )}

          </div>
        </div>
      </SheetContent>

      <EditBookingDetailsDialog
        open={editBookingOpen}
        onOpenChange={setEditBookingOpen}
        appointment={appointment}
      />

      <BillClientModal
        open={isBillingModalOpen}
        onOpenChange={setIsBillingModalOpen}
        bookingId={appointment.bookingId as string}
      />
    </Sheet>
  );
}
