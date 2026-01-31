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
import { Minus, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import type { AppointmentDetails } from "./appointment-details-sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);
  
  // Sync internal state with props
  useEffect(() => {
      setSelectedDate(date);
  }, [date]);

  const handleSelect = (newDate: Date | undefined) => {
      if (!newDate) return;
      if (!selectedDate) {
          setSelectedDate(newDate);
          setDate(newDate);
          return;
      }
      // Keep the time from the previous selection, defaults to 00:00 if just picked
      const newDateTime = new Date(newDate);
      newDateTime.setHours(selectedDate.getHours());
      newDateTime.setMinutes(selectedDate.getMinutes());
      setSelectedDate(newDateTime);
      setDate(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [hours, minutes] = e.target.value.split(':').map(Number);
      if (!selectedDate) return; // Should pick date first
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours);
      newDateTime.setMinutes(minutes);
      setSelectedDate(newDateTime);
      setDate(newDateTime);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP p") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="time" className="sr-only">Time</Label>
              <Input
                  type="time"
                  value={selectedDate ? format(selectedDate, "HH:mm") : ""}
                  onChange={handleTimeChange}
                  className="flex-1"
              />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EditBookingDetailsDialog({
  open,
  onOpenChange,
  appointment,
}: EditBookingDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Data State
  const [allServices, setAllServices] = useState<any[]>([]);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  // Form State
  const [serviceId, setServiceId] = useState<string>("");
  const [subServiceQuantities, setSubServiceQuantities] = useState<Record<string, number>>({});
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});

  // Pricing State
  const [billedAmount, setBilledAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [billedHours, setBilledHours] = useState("");

  // Client & Address State
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [addressData, setAddressData] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: ""
  });

  // Appointment State
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [startDateTime, setStartDateTime] = useState<Date | undefined>(undefined);
  const [endDateTime, setEndDateTime] = useState<Date | undefined>(undefined);
  const [assignedStaff, setAssignedStaff] = useState("");

  // Fetch Services & Booking Data
  useEffect(() => {
    if (open && appointment?.bookingId) {
      setFetching(true);
      Promise.all([
        fetch('/api/services').then(res => res.json()),
        fetch(`/api/bookings/${appointment.bookingId}`).then(res => res.json())
      ]).then(([servicesData, bookingData]) => {
        setAllServices(servicesData);
        setBookingDetails(bookingData);

        // Populate Form
        setServiceId(bookingData.serviceId?._id || bookingData.serviceId || "");

        // Map SubServices
        const subs: Record<string, number> = {};
        bookingData.subServices?.forEach((s: any) => {
          const sId = s.serviceId?._id || s.serviceId;
          subs[sId] = s.quantity;
        });
        setSubServiceQuantities(subs);

        // Map Addons
        const adds: Record<string, number> = {};
        bookingData.addons?.forEach((a: any) => {
          const aId = a.serviceId?._id || a.serviceId;
          adds[aId] = a.quantity;
        });
        setAddonQuantities(adds);

        // Other fields
        setBilledAmount(String(bookingData.pricing?.finalAmount ?? ""));
        setDiscount(String(bookingData.pricing?.discount ?? "0"));
        setBilledHours(String(bookingData.pricing?.billedHours ?? ""));

        setClientName(bookingData.contactId?.firstName ? `${bookingData.contactId.firstName} ${bookingData.contactId.lastName}` : "");
        setClientEmail(bookingData.contactId?.email || "");

        setAddressData({
          street: bookingData.shippingAddress?.street || "",
          city: bookingData.shippingAddress?.city || "",
          state: bookingData.shippingAddress?.state || "",
          zipCode: bookingData.shippingAddress?.zipCode || ""
        });

        setAppointmentNotes(bookingData.notes || "");

        if (bookingData.startDateTime) {
          setStartDateTime(new Date(bookingData.startDateTime));
        }
        if (bookingData.endDateTime) {
          setEndDateTime(new Date(bookingData.endDateTime));
        }

        // Assigned Staff (Technician)
        // Assuming single technician for now, or comma separated if multiple
        const techName = bookingData.technicianId ? `${bookingData.technicianId.firstName} ${bookingData.technicianId.lastName}` : "";
        setAssignedStaff(techName);

      }).catch(err => {
        console.error("Failed to load data", err);
      }).finally(() => {
        setFetching(false);
      });
    }
  }, [open, appointment?.bookingId]);

  // Derived properties for UI
  const availableSubServices = useMemo(() => {
    if (!serviceId) return [];
    return allServices.filter(s => s.parentId === serviceId && s.category === "sub" && s.status === "active");
  }, [allServices, serviceId]);

  const availableAddons = useMemo(() => {
    if (!serviceId) return [];
    return allServices.filter(s => s.parentId === serviceId && s.category === "addon" && s.status === "active");
  }, [allServices, serviceId]);

  const selectedService = useMemo(() => {
    return allServices.find(s => s._id === serviceId);
  }, [allServices, serviceId]);


  const handleSubmit = async () => {
    try {
      setLoading(true);
      // prepare payload
      const payload = {
        serviceId, // Usually doesn't change provided options, but we keep it
        subServices: Object.entries(subServiceQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([sId, qty]) => ({ serviceId: sId, quantity: qty })),
        addons: Object.entries(addonQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([sId, qty]) => ({ serviceId: sId, quantity: qty })),
        notes: appointmentNotes,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        shippingAddress: addressData,
        pricing: {
          // We might need to handle pricing logic properly here if we want auto-calculation.
          // For now, preserving edited values.
          finalAmount: Number(billedAmount),
          discount: Number(discount),
          billedHours: Number(billedHours)
        }
      };

      const res = await fetch(`/api/bookings/${appointment?.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update booking");

      onOpenChange(false);
      // Trigger refresh if needed
      window.location.reload();

    } catch (error) {
      console.error(error);
      alert("Failed to update booking");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 sm:max-w-2xl">
        <div className="border-b text-black">
          <SheetHeader className="gap-0">
            <SheetTitle className="text-lg text-black">Edit Booking Details</SheetTitle>
          </SheetHeader>
        </div>

        {fetching ? (
          <div className="p-8 text-center">Loading details...</div>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="text-sm">
              <span className="text-muted-foreground">Service</span>
              <span className="text-muted-foreground"> : </span>
              <span className="font-medium">{selectedService?.name || "-"}</span>
            </div>

            {/* Dynamic Sub Services */}
            {availableSubServices.length > 0 && (
              <div className="space-y-3">
                <div className="text-base font-semibold text-primary mb-2">Sub Services</div>
                {availableSubServices.map(sub => (
                  <StepperRow
                    key={sub._id}
                    label={sub.name}
                    value={subServiceQuantities[sub._id] || 0}
                    onChange={(val) => setSubServiceQuantities(prev => ({ ...prev, [sub._id]: val }))}
                  />
                ))}
              </div>
            )}

            {/* Dynamic Addons */}
            {availableAddons.length > 0 && (
              <div className="space-y-3">
                <div className="text-base font-semibold text-primary mb-2">Addons</div>
                {availableAddons.map(addon => (
                  <StepperRow
                    key={addon._id}
                    label={addon.name}
                    value={addonQuantities[addon._id] || 0}
                    onChange={(val) => setAddonQuantities(prev => ({ ...prev, [addon._id]: val }))}
                  />
                ))}
              </div>
            )}

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
                  <Input value={Math.max(0, Number(billedAmount) - Number(discount))} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Change Billed Hours</Label>
                  <Input value={billedHours} onChange={(e) => setBilledHours(e.target.value)} placeholder="03:30" />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={clientName} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input value={clientEmail} readOnly className="bg-muted" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Client Address</Label>
                <Textarea
                  value={addressData.street}
                  onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Appointment City</Label>
                <Input
                  value={addressData.city}
                  onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Appointment State</Label>
                <Input
                  value={addressData.state}
                  onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Appointment Zip</Label>
                <Input
                  value={addressData.zipCode}
                  onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Assign Appointment to Staff</Label>
                <Input value={assignedStaff} readOnly className="bg-muted" placeholder="Technician" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Appointment Notes</Label>
                <Textarea value={appointmentNotes} onChange={(e) => setAppointmentNotes(e.target.value)} className="min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label>Start Time *</Label>
                <DateTimePicker date={startDateTime} setDate={setStartDateTime} />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <DateTimePicker date={endDateTime} setDate={setEndDateTime} />
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="flex flex-row items-center justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
