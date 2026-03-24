"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
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
import { Minus, Plus, Loader2 } from "lucide-react";
import type { AppointmentDetails } from "./appointment-details-sheet";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

interface EditBookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentDetails;
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
  const [selectedPromocode, setSelectedPromocode] = useState<string>("none");
  const [customDiscount, setCustomDiscount] = useState<string>("0");

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
  const [bookingStart, setBookingStart] = useState<Date | undefined>(undefined);
  const [assignedStaff, setAssignedStaff] = useState("");

  // Timesheet State
  const [cleaningTime, setCleaningTime] = useState<string>("0");
  const [totalTeamTime, setTotalTeamTime] = useState<string>("0");
  const [generalTime, setGeneralTime] = useState<string>("0");
  const [drivingTime, setDrivingTime] = useState<string>("0");
  const [trainingTime, setTrainingTime] = useState<string>("0");
  const [technicianTime, setTechnicianTime] = useState<string>("0");
  const [timesheetNotes, setTimesheetNotes] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<string>("");

  const minutesToHoursInput = (minutesValue: any) => {
    const minutes = Number(minutesValue);
    if (!Number.isFinite(minutes) || minutes <= 0) return "0";
    return String(Number((minutes / 60).toFixed(2)));
  };

  const hoursInputToMinutes = (hoursValue: string) => {
    const hours = Number(hoursValue);
    if (!Number.isFinite(hours) || hours <= 0) return 0;
    return Math.round(hours * 60);
  };

  // Derive total technician count from co-technicians already in the prop
  // coTechnicians = OTHER techs on the same booking, so total = them + the primary tech
  const technicianCount = Math.max(1, (appointment?.coTechnicians?.length ?? 0) + 1);

  // Pre-warmed calendar events for availability validation (shared SWR cache — no extra fetch)
  const { data: calendarData } = useSWR('/api/appointments/resources', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  const calendarEvents: any[] = calendarData?.events || [];
  const allResources: any[]   = calendarData?.resources || [];

  const { data: promocodesData } = useSWR(open ? "/api/promocodes" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const promocodes: any[] = Array.isArray(promocodesData) ? promocodesData : (promocodesData?.data || []);

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
        // billedAmount here is treated as the "base/total" amount before discount
        // and discount is the amount to subtract.
        const subAmt = Number(bookingData.pricing?.subServicesAmount);
        const addAmt = Number(bookingData.pricing?.addonsAmount);
        const computedTotal = (Number.isFinite(subAmt) ? subAmt : 0) + (Number.isFinite(addAmt) ? addAmt : 0);
        const totalAmount =
          bookingData.pricing?.totalAmount ??
          (computedTotal > 0 ? computedTotal : (bookingData.pricing?.finalAmount ?? ""));
        setBilledAmount(String(totalAmount || ""));

        const existingDiscount = String(bookingData.pricing?.discount ?? "0");
        setDiscount(existingDiscount);
        setCustomDiscount(existingDiscount);

        const existingPromo = bookingData.promoCode || bookingData.promocode || bookingData.promo || null;
        if (existingPromo) {
          setSelectedPromocode(String(existingPromo));
        } else if (Number(existingDiscount) > 0) {
          setSelectedPromocode("custom");
        } else {
          setSelectedPromocode("none");
        }
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

        // Timesheet fields (stored on Booking.timesheet)
        setCleaningTime(minutesToHoursInput(bookingData?.timesheet?.cleaningTime));
        setTotalTeamTime(minutesToHoursInput(bookingData?.timesheet?.totalTeamTime));
        setGeneralTime(minutesToHoursInput(bookingData?.timesheet?.generalTime));
        setDrivingTime(minutesToHoursInput(bookingData?.timesheet?.drivingTime));
        setTrainingTime(minutesToHoursInput(bookingData?.timesheet?.trainingTime));
        setTechnicianTime(minutesToHoursInput(bookingData?.timesheet?.technicianTime));
        setTimesheetNotes(String(bookingData?.timesheet?.notes ?? ""));
        setTeamMembers(Array.isArray(bookingData?.timesheet?.teamMembers) ? bookingData.timesheet.teamMembers.join(", ") : "");

        if (bookingData.startDateTime) {
          setBookingStart(new Date(bookingData.startDateTime));
        }

        // Assigned Staff (Technician)
        const techName = bookingData.technicianId ? `${bookingData.technicianId.firstName} ${bookingData.technicianId.lastName}` : "";
        setAssignedStaff(techName);

      }).catch(err => {
        console.error("Failed to load data", err);
      }).finally(() => {
        setFetching(false);
      });
    }
  }, [open, appointment?.bookingId]);

  // Keep discount synced with promo code selection.
  // - For regular promocodes: discount is derived and not editable
  // - For "custom": discount is editable via customDiscount
  useEffect(() => {
    const base = Math.max(0, Number(billedAmount) || 0);
    if (!open) return;

    if (selectedPromocode === "custom") {
      setDiscount(String(Math.max(0, Number(customDiscount) || 0)));
      return;
    }
    if (selectedPromocode === "none") {
      setDiscount("0");
      return;
    }

    const promo = promocodes.find((p: any) => p?.code === selectedPromocode);
    if (!promo) {
      setDiscount("0");
      return;
    }

    const raw =
      promo.type === "percentage"
        ? base * (Number(promo.value) / 100)
        : Number(promo.value);

    setDiscount(String(Math.max(0, Math.min(raw, base)).toFixed(2)));
  }, [selectedPromocode, customDiscount, billedAmount, promocodes, open]);

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

  // ── FIXED: Price calculation — mirrors AddBookingForm's calculateItemPrice:
  //   price = (basePrice + hourlyRate × (estimatedTime_min / 60) × qty) × (1 + rangePercentage/100)
  useEffect(() => {
    if (fetching || !selectedService) return;

    const calculateItemPrice = (item: any, quantity: number): number => {
      const B = Number(item.basePrice) || 0;
      const H = Number(item.hourlyRate) || 0;
      const R = Number(item.rangePercentage) || 0;
      const T_minutes = item.estimatedTime ? Number(item.estimatedTime) : 0;
      const hoursPerUnit = T_minutes / 60;
      const totalLaborCost = H * hoursPerUnit * quantity;
      const subtotal = B + totalLaborCost;
      return subtotal * (1 + R / 100);
    };

    let subTotal = 0;
    let addonsTotal = 0;

    availableSubServices.forEach((sub: any) => {
      const qty = subServiceQuantities[sub._id] || 0;
      if (qty > 0) subTotal += calculateItemPrice(sub, qty);
    });

    availableAddons.forEach((addon: any) => {
      const qty = addonQuantities[addon._id] || 0;
      if (qty > 0) addonsTotal += calculateItemPrice(addon, qty);
    });

    setBilledAmount((subTotal + addonsTotal).toFixed(2));

  }, [selectedService, subServiceQuantities, addonQuantities, availableSubServices, availableAddons, fetching]);

  // ── End time calculation ─ divided by technician count (team sharing)
  const bookingEnd = useMemo(() => {
    if (!bookingStart) return undefined;

    let totalMinutes = 0;

    availableSubServices.forEach((sub: any) => {
      const qty = subServiceQuantities[sub._id] || 0;
      if (qty > 0 && sub.estimatedTime) totalMinutes += sub.estimatedTime * qty;
    });

    availableAddons.forEach((addon: any) => {
      const qty = addonQuantities[addon._id] || 0;
      if (qty > 0 && addon.estimatedTime) totalMinutes += addon.estimatedTime * qty;
    });

    // Divide by number of technicians so each tech's slot is shorter
    const perTechMinutes = technicianCount > 1 && totalMinutes > 0
      ? totalMinutes / technicianCount
      : totalMinutes;

    if (perTechMinutes > 0) {
      return new Date(bookingStart.getTime() + perTechMinutes * 60 * 1000);
    } else if (selectedService?.estimatedTime) {
      return new Date(bookingStart.getTime() + (selectedService.estimatedTime / technicianCount) * 60 * 1000);
    }
    return addMinutes(bookingStart, 60);
  }, [bookingStart, availableSubServices, availableAddons, subServiceQuantities, addonQuantities, selectedService, technicianCount]);


  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!bookingStart || !bookingEnd) {
        toast.error("Please select a start date");
        setLoading(false);
        return;
      }

      // ── Validate end time doesn't exceed technician's working hours ──
      const primaryTechId = bookingDetails?.technicianId?._id?.toString() || bookingDetails?.technicianId?.toString();
      if (primaryTechId) {
        const violation = calendarEvents.find((ev: any) => {
          if (ev.resourceId !== primaryTechId) return false;
          if (ev.type !== 'unavailability_timed' && ev.type !== 'unavailability') return false;
          const evStart = new Date(ev.start).getTime();
          const evEnd   = new Date(ev.end).getTime();
          return bookingStart.getTime() < evEnd && bookingEnd.getTime() > evStart;
        });
        if (violation) {
          const techName = allResources.find((r: any) => r.id === primaryTechId)?.title || 'The technician';
          toast.error(`${techName}'s booking end time overlaps with their unavailable hours. Please adjust the time.`);
          setLoading(false);
          return;
        }
      }

      const baseAmountNum = Math.max(0, Number(billedAmount) || 0);
      const discountNum = Math.max(0, Number(discount) || 0);
      const finalAmountNum = Math.max(0, baseAmountNum - discountNum);

      const payload: any = {
        serviceId,
        subServices: Object.entries(subServiceQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([sId, qty]) => ({ serviceId: sId, quantity: qty })),
        addons: Object.entries(addonQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([sId, qty]) => ({ serviceId: sId, quantity: qty })),
        notes: appointmentNotes,
        startDateTime: bookingStart,
        endDateTime: bookingEnd,
        shippingAddress: addressData,
        pricing: {
          finalAmount: finalAmountNum,
          discount: discountNum,
          billedHours: Number(billedHours)
        },
        timesheet: {
          cleaningTime: hoursInputToMinutes(cleaningTime),
          totalTeamTime: hoursInputToMinutes(totalTeamTime),
          generalTime: hoursInputToMinutes(generalTime),
          drivingTime: hoursInputToMinutes(drivingTime),
          trainingTime: hoursInputToMinutes(trainingTime),
          technicianTime: hoursInputToMinutes(technicianTime),
          teamMembers: teamMembers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          notes: timesheetNotes,
        },
      };
      if (selectedPromocode && selectedPromocode !== "none" && selectedPromocode !== "custom") {
        payload.promoCode = selectedPromocode;
      } else {
        payload.promoCode = undefined;
      }

      const res = await fetch(`/api/bookings/${appointment?.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update booking");

      onOpenChange(false);
      window.location.reload();

    } catch (error) {
      console.error(error);
      toast.error("Failed to update booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 sm:max-w-5xl">
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
                  <Label>Promo Code</Label>
                  <Select value={selectedPromocode} onValueChange={(v) => setSelectedPromocode(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select promo code" />
                    </SelectTrigger>
                    <SelectContent className="z-[150]" position="popper">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="custom">Custom discount</SelectItem>
                      {promocodes.map((p: any) => (
                        <SelectItem key={p._id || p.code} value={p.code}>
                          {p.code} – {p.type === "percentage" ? `${p.value}%` : `$${p.value}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {selectedPromocode === "custom" ? "Custom Discount Amount" : "Discount Amount"}
                  </Label>
                  <Input
                    value={selectedPromocode === "custom" ? customDiscount : discount}
                    onChange={(e) => {
                      if (selectedPromocode === "custom") setCustomDiscount(e.target.value);
                    }}
                    readOnly={selectedPromocode !== "custom"}
                    className={selectedPromocode === "custom" ? "" : "bg-muted"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Change Billed Amount</Label>
                  <Input value={billedAmount} onChange={(e) => setBilledAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Change Discount</Label>
                  <Input
                    value={discount}
                    onChange={(e) => {
                      // If user starts typing here, treat it as a custom discount
                      setSelectedPromocode("custom");
                      setCustomDiscount(e.target.value);
                    }}
                  />
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

              <Separator className="md:col-span-2" />

              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-semibold text-foreground">Timesheet</div>
                <div className="text-xs text-muted-foreground">
                  Enter values in hours (numbers). These values will be saved on the booking.
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cleaning Time (hrs)</Label>
                <Input value={cleaningTime} onChange={(e) => setCleaningTime(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Total Team Time (hrs)</Label>
                <Input value={totalTeamTime} onChange={(e) => setTotalTeamTime(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>General Time (hrs)</Label>
                <Input value={generalTime} onChange={(e) => setGeneralTime(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Driving Time (hrs)</Label>
                <Input value={drivingTime} onChange={(e) => setDrivingTime(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Training Time (hrs)</Label>
                <Input value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Technician Time (hrs)</Label>
                <Input value={technicianTime} onChange={(e) => setTechnicianTime(e.target.value)} placeholder="0" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Team Members (comma separated)</Label>
                <Input value={teamMembers} onChange={(e) => setTeamMembers(e.target.value)} placeholder="John, Sarah, ..." />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Timesheet Notes</Label>
                <Textarea value={timesheetNotes} onChange={(e) => setTimesheetNotes(e.target.value)} className="min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label>Start Date/Time</Label>
                <DateTimePicker
                  date={bookingStart}
                  setDate={setBookingStart}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date/Time (Auto-calculated)</Label>
                <Input
                  value={bookingEnd ? format(bookingEnd, "PPP HH:mm") : ""}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="flex flex-row items-center justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Updating..." : "Update"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}