"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus } from "lucide-react";
import type { AppointmentDetails } from "./appointment-details-sheet";

interface EditBookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentDetails;
}

function toDateInputValue(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(date: Date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseUnits(units: string) {
  const result: Record<string, number> = {};
  units.split(",").forEach((chunk) => {
    const [k, v] = chunk.split("-");
    const key = (k || "").trim().toLowerCase();
    const value = Number((v || "").trim());
    if (!Number.isNaN(value) && key) result[key] = value;
  });
  return result;
}

function StepperRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
      <div className="font-medium text-foreground">{label}</div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="w-6 text-center font-semibold text-foreground">{value}</div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function EditBookingDetailsDialog({
  open,
  onOpenChange,
  appointment,
}: EditBookingDetailsDialogProps) {
  const initial = useMemo(() => {
    const units = typeof appointment?.units === "string" ? parseUnits(appointment.units) : {};
    return {
      service: String(appointment?.service ?? ""),
      bedrooms: units.bedrooms ?? 0,
      bathrooms: units.bathrooms ?? 0,
      fridgeCleaning: 0,
      ovenCleaning: 0,
      billedAmount: String(appointment?.bookingPrice ?? ""),
      discount: "0",
      billedHours: String(appointment?.billedHours ?? ""),
      clientName: String(appointment?.customerName ?? ""),
      clientEmail: String(appointment?.customerEmail ?? ""),
      clientAddress: String(appointment?.customerAddress ?? ""),
      appointmentCity: "",
      appointmentState: "",
      appointmentZip: "",
      appointmentNotes: String(appointment?.notes ?? ""),
      startDate: appointment?.start ? toDateInputValue(appointment.start) : "",
      startTime: appointment?.start ? toTimeInputValue(appointment.start) : "",
      endDate: appointment?.end ? toDateInputValue(appointment.end) : "",
      endTime: appointment?.end ? toTimeInputValue(appointment.end) : "",
      lat: "",
      long: "",
      assignedStaff: String(appointment?.assignedStaff ?? ""),
    };
  }, [appointment]);

  const [service, setService] = useState(initial.service);
  const [bedrooms, setBedrooms] = useState(initial.bedrooms);
  const [bathrooms, setBathrooms] = useState(initial.bathrooms);
  const [fridgeCleaning, setFridgeCleaning] = useState(initial.fridgeCleaning);
  const [ovenCleaning, setOvenCleaning] = useState(initial.ovenCleaning);
  const [billedAmount, setBilledAmount] = useState(initial.billedAmount);
  const [discount, setDiscount] = useState(initial.discount);
  const [billedHours, setBilledHours] = useState(initial.billedHours);
  const [clientName, setClientName] = useState(initial.clientName);
  const [clientEmail, setClientEmail] = useState(initial.clientEmail);
  const [clientAddress, setClientAddress] = useState(initial.clientAddress);
  const [appointmentCity, setAppointmentCity] = useState(initial.appointmentCity);
  const [appointmentState, setAppointmentState] = useState(initial.appointmentState);
  const [appointmentZip, setAppointmentZip] = useState(initial.appointmentZip);
  const [appointmentNotes, setAppointmentNotes] = useState(initial.appointmentNotes);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [lat, setLat] = useState(initial.lat);
  const [long, setLong] = useState(initial.long);
  const [assignedStaff, setAssignedStaff] = useState(initial.assignedStaff);

  useEffect(() => {
    if (!open) return;
    setService(initial.service);
    setBedrooms(initial.bedrooms);
    setBathrooms(initial.bathrooms);
    setFridgeCleaning(initial.fridgeCleaning);
    setOvenCleaning(initial.ovenCleaning);
    setBilledAmount(initial.billedAmount);
    setDiscount(initial.discount);
    setBilledHours(initial.billedHours);
    setClientName(initial.clientName);
    setClientEmail(initial.clientEmail);
    setClientAddress(initial.clientAddress);
    setAppointmentCity(initial.appointmentCity);
    setAppointmentState(initial.appointmentState);
    setAppointmentZip(initial.appointmentZip);
    setAppointmentNotes(initial.appointmentNotes);
    setStartDate(initial.startDate);
    setStartTime(initial.startTime);
    setEndDate(initial.endDate);
    setEndTime(initial.endTime);
    setLat(initial.lat);
    setLong(initial.long);
    setAssignedStaff(initial.assignedStaff);
  }, [initial, open]);

  const discountAmount = useMemo(() => {
    const amt = Number(String(billedAmount).replace(/[^0-9.]/g, ""));
    const dis = Number(discount);
    if (Number.isNaN(amt) || Number.isNaN(dis)) return "";
    return String(Math.max(0, amt - dis));
  }, [billedAmount, discount]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 sm:max-w-2xl">
        <div className="border-b text-black">
          <SheetHeader className="gap-0">
            <SheetTitle className="text-lg text-black">Edit Booking Details</SheetTitle>
          </SheetHeader>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="text-sm">
            <span className="text-muted-foreground">Service</span>
            <span className="text-muted-foreground"> : </span>
            <span className="font-medium">{service || "-"}</span>
          </div>

          <div className="space-y-3">
            <div className="text-base font-semibold text-primary mb-2">Sub Services</div>
            <StepperRow label="Bedrooms" value={bedrooms} onChange={setBedrooms} />
            <StepperRow label="Bathrooms" value={bathrooms} onChange={setBathrooms} />
          </div>

          <div className="space-y-3">
            <div className="text-base font-semibold text-primary mb-2">Addons</div>
            <StepperRow label="Fridge Cleaning" value={fridgeCleaning} onChange={setFridgeCleaning} />
            <StepperRow label="Oven Cleaning" value={ovenCleaning} onChange={setOvenCleaning} />
          </div>

          <div className="space-y-4">
            <div className="text-base font-semibold text-foreground">Estimated Price & Duration</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Change Billed Amount</Label>
                <Input value={billedAmount} onChange={(e) => setBilledAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Change Discount</Label>
                <Input value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discount Amount</Label>
                <Input value={discountAmount} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Change Billed Hours</Label>
                <Input value={billedHours} onChange={(e) => setBilledHours(e.target.value)} placeholder="03:30" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Billed Amount...</Label>
                <Input value={String(appointment?.estimatedBilledAmount ?? "")} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Estimated Billed Hours==</Label>
                <Input value={String(appointment?.estimatedBilledHours ?? "")} readOnly className="bg-muted" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Client Address</Label>
              <Textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Appointment City</Label>
              <Input value={appointmentCity} onChange={(e) => setAppointmentCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Appointment State</Label>
              <Select value={appointmentState} onValueChange={setAppointmentState}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alabama">Alabama</SelectItem>
                  <SelectItem value="California">California</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Appointment Zip</Label>
              <Input value={appointmentZip} onChange={(e) => setAppointmentZip(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Assign Appointment to Staff</Label>
              <Input value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)} placeholder="Staff name" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Appointment Notes</Label>
              <Textarea value={appointmentNotes} onChange={(e) => setAppointmentNotes(e.target.value)} className="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Lat</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Long</Label>
              <Input value={long} onChange={(e) => setLong(e.target.value)} />
            </div>
          </div>
        </div>

        <SheetFooter className="flex flex-row items-center justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Update</Button>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Update all recurring
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
