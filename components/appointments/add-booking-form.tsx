"use client";

import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

import { useEvents } from "@/context/events-context";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
    Check, ChevronsUpDown, X, Calendar as CalendarIcon,
    DollarSign, Clock, ChevronDown, ChevronUp, Plus, Minus
} from "lucide-react";
import {
    useState, useEffect, useCallback, useMemo, useRef,
    lazy, Suspense, memo
} from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Promocode } from "@/components/company-settings/types";

// ─── Lazy-load the heavy country-state-city library so it doesn't block
//     the initial JS bundle parse. This alone can shave 200-400ms off TTI.
// ─── Usage: countryLib.current after the async import resolves.
let countryLibCache: any = null;
async function loadCountryLib() {
    if (countryLibCache) return countryLibCache;
    const mod = await import("country-state-city");
    countryLibCache = mod;
    return countryLibCache;
}

// ─── AccordionItem — memo'd so it only re-renders when its own props change.
const AccordionItem = memo(function AccordionItem({
    title, isOpen, onToggle, children,
}: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <div className="border rounded-md bg-card mb-2 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
            >
                <span className="font-medium text-foreground">{title}</span>
                {isOpen
                    ? <ChevronUp className="h-4 w-4 text-primary" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t bg-card animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
});

// ─── Virtualized / searchable country-state-city select.
//     Renders only a filtered slice instead of 250+ SelectItems at once.
//     This is the single biggest render-time win in the whole form.
const SearchableSelect = memo(function SearchableSelect({
    value,
    onChange,
    options,
    placeholder,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
    disabled?: boolean;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);

    const filtered = useMemo(() => {
        if (!query) return options.slice(0, 100); // never render more than 100 at once
        const q = query.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 100);
    }, [query, options]);

    const displayLabel = useMemo(
        () => options.find(o => o.value === value)?.label ?? "",
        [options, value]
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    <span className="truncate">{displayLabel || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[200]" align="start">
                <div className="p-2 border-b">
                    <Input
                        autoFocus
                        placeholder="Search…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="h-8"
                    />
                </div>
                <div className="max-h-56 overflow-y-auto">
                    {filtered.length === 0
                        ? <p className="p-3 text-sm text-muted-foreground">No results</p>
                        : filtered.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2",
                                    value === opt.value && "bg-muted font-medium"
                                )}
                            >
                                {value === opt.value && <Check className="h-3 w-3 shrink-0" />}
                                {opt.label}
                            </button>
                        ))
                    }
                </div>
            </PopoverContent>
        </Popover>
    );
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddBookingFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: { start: Date; end: Date; technicianId?: string };
    technicians?: any[];
    calendarEvents?: any[];
}

// ─── Default state factories — avoids object allocation in useState initialisers
const defaultPersonal = () => ({
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
    country: "United States",
    city: "",
    state: "California",
    zipCode: "",
    gender: "Prefer not to say",
});

const defaultShipping = () => ({
    shippingAddress: "",
    shippingCountry: "United States",
    shippingCity: "",
    shippingState: "California",
    shippingZipCode: "",
});

// ─── Main component ──────────────────────────────────────────────────────────

export function AddBookingForm({
    open,
    onOpenChange,
    initialData,
    technicians,
    calendarEvents: calendarEventsProp,
}: AddBookingFormProps) {
    const { mutate } = useSWRConfig();

    // ── Section accordion state
    const [sections, setSections] = useState({ personal: true, service: false });

    // ── User type
    const [userType, setUserType] = useState<"new" | "existing">("new");

    // ── Email gets its own state so the debounce effect only fires on email changes
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // ── Country-state-city data (lazy loaded)
    const [geoLib, setGeoLib] = useState<any>(null);
    useEffect(() => {
        // Load the heavy geo library only once, in the background, after mount.
        loadCountryLib().then(setGeoLib);
    }, []);

    // ── Technician tracking
    const [selectedTechnicianServiceId, setSelectedTechnicianServiceId] = useState<string | null>(
        initialData?.technicianId ?? null
    );
    const allTechnicians: any[] = technicians || [];
    const calendarEvents: any[] = calendarEventsProp || [];

    // ── Remote data — contacts only when needed
    const { data: contactsData } = useSWR(
        open && userType === "existing" ? "/api/contacts" : null,
        fetcher,
        { revalidateOnFocus: false }
    );
    const contacts: any[] = contactsData || [];

    // ── Promocodes — reuse pre-warmed cache; allow mount revalidation only
    //    if data is older than 60 s (dedupingInterval handles this).
    const { data: promocodesData } = useSWR(
        open ? "/api/promocodes" : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000 }
    );
    const promocodes: Promocode[] = promocodesData || [];

    // ── Services per technician
    const { data: servicesData } = useSWR(
        open && selectedTechnicianServiceId
            ? `/api/users/${selectedTechnicianServiceId}/services`
            : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000, revalidateOnMount: false }
    );
    const services: any[] = servicesData || [];

    // ── Form state
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>(
        initialData?.technicianId ? [initialData.technicianId] : []
    );
    const [personalData, setPersonalData] = useState(defaultPersonal);
    const [shippingData, setShippingData] = useState(defaultShipping);
    const [notes, setNotes] = useState("");

    const [bookingType, setBookingType] = useState<"once" | "recurring">("once");
    const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [monthlyWeeks, setMonthlyWeeks] = useState<{ week: number; dayOfWeek: number }[]>([]);
    const [recurringEndDate, setRecurringEndDate] = useState("");

    const [bookingStart, setBookingStart] = useState<Date | undefined>(initialData?.start);
    const [bookingEnd, setBookingEnd] = useState<Date | undefined>(initialData?.end);

    const [subServiceQuantities, setSubServiceQuantities] = useState<Record<string, number>>({});
    const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});

    const [discount, setDiscount] = useState(0);
    const [selectedPromocode, setSelectedPromocode] = useState<string>("");

    // ── Reset all form state when the sheet closes, so re-opening is instant
    //    (no stale state, no re-render debt from old heavy values).
    useEffect(() => {
        if (!open) {
            setUserType("new");
            setEmail("");
            setEmailError("");
            setSections({ personal: true, service: false });
            setSelectedContact(null);
            setSelectedService(null);
            setPersonalData(defaultPersonal());
            setShippingData(defaultShipping());
            setNotes("");
            setBookingType("once");
            setFrequency("weekly");
            setSelectedDays([]);
            setMonthlyWeeks([]);
            setRecurringEndDate("");
            setSubServiceQuantities({});
            setAddonQuantities({});
            setDiscount(0);
            setSelectedPromocode("");
        }
    }, [open]);

    // ── Sync initial data when opening
    useEffect(() => {
        if (open) {
            if (initialData?.start) setBookingStart(initialData.start);
            if (initialData?.end) setBookingEnd(initialData.end);
            if (initialData?.technicianId) {
                setSelectedTechnicianServiceId(initialData.technicianId);
                setSelectedTechnicianIds([initialData.technicianId]);
            }
        }
    }, [open, initialData?.start, initialData?.end, initialData?.technicianId]);

    // ── Accordion toggle — stable reference
    const toggleSection = useCallback((key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // ── Auto-calculate end time
    useEffect(() => {
        if (!selectedService || !bookingStart) return;
        let totalMinutes = 0;
        selectedService.subServices?.forEach((sub: any) => {
            const qty = subServiceQuantities[sub._id] || 0;
            if (qty > 0 && sub.estimatedTime) totalMinutes += sub.estimatedTime * qty;
        });
        selectedService.addons?.forEach((addon: any) => {
            const qty = addonQuantities[addon._id] || 0;
            if (qty > 0 && addon.estimatedTime) totalMinutes += addon.estimatedTime * qty;
        });
        const techCount = Math.max(1, selectedTechnicianIds.length);
        if (totalMinutes > 0) {
            setBookingEnd(new Date(bookingStart.getTime() + (totalMinutes / techCount) * 60_000));
        } else if (selectedService.estimatedTime) {
            setBookingEnd(new Date(bookingStart.getTime() + (selectedService.estimatedTime / techCount) * 60_000));
        } else {
            setBookingEnd(new Date(bookingStart.getTime() + 60 * 60_000));
        }
    }, [selectedService, subServiceQuantities, addonQuantities, bookingStart, selectedTechnicianIds.length]);

    // ── Email existence check — debounced 2 s, only fires when email changes
    useEffect(() => {
        if (userType !== "new" || !email) {
            setEmailError("");
            setIsCheckingEmail(false);
            return;
        }
        const id = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const res = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
                const data = await res.json();
                setEmailError(
                    data.exists
                        ? "This email is already registered. Please use a different email or select 'Existing User'."
                        : ""
                );
            } catch {
                // silently ignore network errors for the check
            } finally {
                setIsCheckingEmail(false);
            }
        }, 2000);
        return () => clearTimeout(id);
    }, [email, userType]);

    // ── Geo options — derived lazily from the async-loaded library.
    //    These never change during a session so memoization is very effective.
    const countryOptions = useMemo(() => {
        if (!geoLib) return [];
        return geoLib.Country.getAllCountries().map((c: any) => ({ label: c.name, value: c.name, isoCode: c.isoCode }));
    }, [geoLib]);

    const { stateOptions, cityOptions } = useMemo(() => {
        if (!geoLib || !personalData.country) return { stateOptions: [], cityOptions: [] };
        const allCountries = geoLib.Country.getAllCountries();
        const country = allCountries.find((c: any) => c.name === personalData.country);
        const code = country?.isoCode;
        const states = code ? geoLib.State.getStatesOfCountry(code) : [];
        const stateOptions = states.map((s: any) => ({ label: s.name, value: s.name, isoCode: s.isoCode }));
        const selState = states.find((s: any) => s.name === personalData.state);
        const cities = code && selState
            ? geoLib.City.getCitiesOfState(code, selState.isoCode)
            : [];
        const cityOptions = cities.map((c: any) => ({ label: c.name, value: c.name }));
        return { stateOptions, cityOptions };
    }, [geoLib, personalData.country, personalData.state]);

    const { shippingStateOptions, shippingCityOptions } = useMemo(() => {
        if (!geoLib || !shippingData.shippingCountry) return { shippingStateOptions: [], shippingCityOptions: [] };
        const allCountries = geoLib.Country.getAllCountries();
        const country = allCountries.find((c: any) => c.name === shippingData.shippingCountry);
        const code = country?.isoCode;
        const states = code ? geoLib.State.getStatesOfCountry(code) : [];
        const shippingStateOptions = states.map((s: any) => ({ label: s.name, value: s.name, isoCode: s.isoCode }));
        const selState = states.find((s: any) => s.name === shippingData.shippingState);
        const cities = code && selState
            ? geoLib.City.getCitiesOfState(code, selState.isoCode)
            : [];
        const shippingCityOptions = cities.map((c: any) => ({ label: c.name, value: c.name }));
        return { shippingStateOptions, shippingCityOptions };
    }, [geoLib, shippingData.shippingCountry, shippingData.shippingState]);

    // ── Available technicians — filtered for service + no time-off overlap
    const filteredTechnicians = useMemo(() => {
        if (!selectedService || !bookingStart || !bookingEnd) return [];
        const clickedTech = allTechnicians.find(t => t.id === initialData?.technicianId);
        const targetZone = clickedTech?.group;
        const bookStart = bookingStart.getTime();
        const bookEnd = bookingEnd.getTime();

        return allTechnicians.filter(tech => {
            if (targetZone && tech.group !== targetZone) return false;
            if (tech.services && !tech.services.some((id: any) =>
                id.toString() === selectedService._id.toString()
            )) return false;
            // Time-off overlap check
            return !calendarEvents.some((ev: any) => {
                if (ev.resourceId !== tech.id) return false;
                if (ev.type !== "unavailability" && ev.type !== "unavailability_timed") return false;
                const evStart = new Date(ev.start).getTime();
                const evEnd = new Date(ev.end).getTime();
                return bookStart < evEnd && bookEnd > evStart;
            });
        });
    }, [selectedService, bookingStart, bookingEnd, allTechnicians, initialData?.technicianId, calendarEvents]);

    // ── Handlers — all stable references via useCallback
    const handleTechnicianChange = useCallback((ids: string[]) => {
        setSelectedTechnicianIds(ids);
        if (ids.length > 0) setSelectedTechnicianServiceId(ids[0]);
    }, []);

    const handleContactSelect = useCallback((contactId: string) => {
        const contact = contacts.find(c => c._id === contactId);
        if (!contact) return;
        setSelectedContact(contact);
        setEmail(contact.email || "");
        setPersonalData(prev => ({
            ...prev,
            firstName: contact.firstName || "",
            lastName: contact.lastName || "",
            phoneNumber: contact.phoneNumber || "",
            address: contact.address || "",
            city: contact.city || "",
            state: contact.state || "California",
            zipCode: contact.zipCode || "",
            country: contact.country || "United States",
        }));
    }, [contacts]);

    const handleSameAsAbove = useCallback(() => {
        setShippingData({
            shippingCountry: personalData.country,
            shippingAddress: personalData.address,
            shippingCity: personalData.city,
            shippingState: personalData.state,
            shippingZipCode: personalData.zipCode,
        });
    }, [personalData]);

    const handleServiceSelect = useCallback((serviceId: string) => {
        const service = services.find(s => s._id === serviceId);
        if (!service) return;
        setSelectedService(service);
        const subQty: Record<string, number> = {};
        service.subServices?.forEach((s: any) => { subQty[s._id] = 0; });
        setSubServiceQuantities(subQty);
        const addQty: Record<string, number> = {};
        service.addons?.forEach((a: any) => { addQty[a._id] = 0; });
        setAddonQuantities(addQty);
    }, [services]);

    const updateQuantity = useCallback((id: string, delta: number, type: "sub" | "addon") => {
        if (type === "sub") {
            setSubServiceQuantities(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
        } else {
            setAddonQuantities(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
        }
    }, []);

    const toggleDay = useCallback((day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    }, []);

    const toggleMonthlyWeekDay = useCallback((week: number, dayOfWeek: number) => {
        setMonthlyWeeks(prev => {
            const exists = prev.some(w => w.week === week && w.dayOfWeek === dayOfWeek);
            return exists
                ? prev.filter(w => !(w.week === week && w.dayOfWeek === dayOfWeek))
                : [...prev, { week, dayOfWeek }];
        });
    }, []);

    // ── Price calculation — only recalculates when pricing inputs change
    const { total, subTotal, addonsTotal } = useMemo(() => {
        if (!selectedService) return { total: 0, subTotal: 0, addonsTotal: 0 };

        const totalBookingHours = bookingStart && bookingEnd
            ? (bookingEnd.getTime() - bookingStart.getTime()) / 3_600_000
            : 0;

        const calcPrice = (item: any, qty: number) => {
            const B = Number(item.basePrice) || 0;
            const H = Number(item.hourlyRate) || 0;
            const R = Number(item.rangePercentage) || 0;
            const hours = item.estimatedTime ? Number(item.estimatedTime) / 60 : totalBookingHours;
            return (B + H * hours * qty) * (1 + R / 100);
        };

        let subTotal = 0;
        let addonsTotal = 0;
        selectedService.subServices?.forEach((sub: any) => {
            const qty = subServiceQuantities[sub._id] || 0;
            if (qty > 0) subTotal += calcPrice(sub, qty);
        });
        selectedService.addons?.forEach((addon: any) => {
            const qty = addonQuantities[addon._id] || 0;
            if (qty > 0) addonsTotal += calcPrice(addon, qty);
        });
        return { total: subTotal + addonsTotal, subTotal, addonsTotal };
    }, [selectedService, subServiceQuantities, addonQuantities, bookingStart, bookingEnd]);

    // ── Promo discount
    useEffect(() => {
        if (!selectedPromocode || selectedPromocode === "none") {
            setDiscount(0);
            return;
        }
        const promo = promocodes.find(p => p.code === selectedPromocode);
        if (!promo || promo.limit === 0) {
            setDiscount(0);
            if (promo?.limit === 0) setSelectedPromocode("none");
            return;
        }
        const val = promo.type === "percentage"
            ? total * (Number(promo.value) / 100)
            : Number(promo.value);
        setDiscount(Number(Math.min(val, total).toFixed(2)));
    }, [selectedPromocode, total, promocodes]);

    const finalAmount = total - discount;
    const durationInHours = bookingStart && bookingEnd
        ? (bookingEnd.getTime() - bookingStart.getTime()) / 3_600_000
        : 0;
    const effectiveRate = durationInHours > 0 ? finalAmount / durationInHours : 0;

    // ── Contact options — memoized list
    const contactSelectOptions = useMemo(() => contacts.map(c => (
        <SelectItem key={c._id} value={c._id}>
            {c.firstName} {c.lastName} – {c.email}
        </SelectItem>
    )), [contacts]);

    // ── Submit
    const handleSubmit = async () => {
        try {
            let contactId = selectedContact?._id;
            let newContactData = null;

            if (userType === "new") {
                if (emailError) { toast.error("Please fix the email error before submitting"); return; }
                if (!email || !personalData.password || !personalData.firstName || !personalData.lastName) {
                    toast.error("Please fill all required fields (Email, Password, First Name, Last Name)");
                    return;
                }
                newContactData = {
                    email,
                    password: personalData.password,
                    firstName: personalData.firstName,
                    lastName: personalData.lastName,
                    phone: personalData.phoneNumber,
                    streetAddress: personalData.address,
                    country: personalData.country,
                    city: personalData.city,
                    state: personalData.state,
                    zipCode: personalData.zipCode,
                    gender: personalData.gender,
                };
            }

            if ((!contactId && !newContactData) || !selectedService) {
                toast.error("Please select a contact and service");
                return;
            }

            if (bookingType === "recurring") {
                if (!recurringEndDate?.trim()) { toast.error("Please set a recurring end date"); return; }
                if (frequency === "monthly" && !monthlyWeeks.length) {
                    toast.error("Please select at least one week/day combination"); return;
                }
                if (frequency === "weekly" && !selectedDays.length) {
                    toast.error("Please select at least one day for recurrence"); return;
                }
            }

            // Validate no time-off overlap
            if (bookingStart && bookingEnd) {
                for (const techId of selectedTechnicianIds) {
                    const violation = calendarEvents.find((ev: any) => {
                        if (ev.resourceId !== techId) return false;
                        if (ev.type !== "unavailability_timed" && ev.type !== "unavailability") return false;
                        const evStart = new Date(ev.start).getTime();
                        const evEnd = new Date(ev.end).getTime();
                        return bookingStart.getTime() < evEnd && bookingEnd.getTime() > evStart;
                    });
                    if (violation) {
                        const techName = allTechnicians.find(t => t.id === techId)?.title || "A technician";
                        toast.error(`${techName}'s booking overlaps with their unavailable hours.`);
                        return;
                    }
                }
            }

            const subServices = Object.entries(subServiceQuantities)
                .filter(([, qty]) => qty > 0)
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));
            const addons = Object.entries(addonQuantities)
                .filter(([, qty]) => qty > 0)
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));

            const bookingRes = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    newContact: newContactData,
                    contactId,
                    technicianId: initialData?.technicianId,
                    technicianIds: selectedTechnicianIds,
                    serviceId: selectedService._id,
                    subServices,
                    addons,
                    bookingType,
                    frequency: bookingType === "recurring" ? frequency : undefined,
                    customRecurrence:
                        bookingType === "recurring"
                            ? frequency === "monthly"
                                ? { monthlyWeeks, endDate: recurringEndDate }
                                : { selectedDays, endDate: recurringEndDate }
                            : undefined,
                    startDateTime: bookingStart,
                    endDateTime: bookingEnd,
                    shippingAddress: {
                        street: shippingData.shippingAddress,
                        country: shippingData.shippingCountry,
                        city: shippingData.shippingCity,
                        state: shippingData.shippingState,
                        zipCode: shippingData.shippingZipCode,
                    },
                    notes,
                    pricing: {
                        baseAmount: selectedService.basePrice || selectedService.hourlyRate || 0,
                        subServicesAmount: subTotal,
                        addonsAmount: addonsTotal,
                        totalAmount: total,
                        discount,
                        finalAmount,
                        billedHours: 0,
                    },
                    promoCode: selectedPromocode !== "none" ? selectedPromocode : undefined,
                }),
            });

            if (!bookingRes.ok) {
                const err = await bookingRes.json();
                throw new Error(err.error || "Failed to create booking");
            }

            toast.success(
                bookingType === "once"
                    ? "Booking created successfully!"
                    : "Recurring bookings created successfully!"
            );
            onOpenChange(false);
            mutate(
                (key) => typeof key === "string" && key.startsWith("/api/appointments/resources"),
                undefined,
                { revalidate: true }
            );
        } catch (error: any) {
            toast.error(error.message || "Failed to create booking. Please try again.");
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col z-[100]">
                <SheetHeader className="p-4 border-b gap-0">
                    <SheetTitle>Add Manual Booking</SheetTitle>
                    <SheetDescription>Enter appointment and customer details below.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* ── Personal Details ───────────────────────────────── */}
                    <AccordionItem
                        title="Your Personal Details"
                        isOpen={sections.personal}
                        onToggle={() => toggleSection("personal")}
                    >
                        <div className="space-y-6">
                            <RadioGroup
                                value={userType}
                                className="flex gap-6"
                                onValueChange={v => setUserType(v as "new" | "existing")}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="new" id="new-user" />
                                    <Label htmlFor="new-user" className="cursor-pointer font-medium">New User</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="existing" id="existing-user" />
                                    <Label htmlFor="existing-user" className="cursor-pointer font-medium">Existing User</Label>
                                </div>
                            </RadioGroup>

                            {userType === "existing" && (
                                <div className="space-y-1">
                                    <Label>Select Contact</Label>
                                    <Select onValueChange={handleContactSelect}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose a contact" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]" position="popper">
                                            {contactSelectOptions}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Preferred Email</Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Enter email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            disabled={userType === "existing"}
                                            className={emailError ? "border-red-500" : ""}
                                        />
                                        {isCheckingEmail && userType === "new" && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                    {emailError && userType === "new" && (
                                        <p className="text-sm text-red-500 mt-1">{emailError}</p>
                                    )}
                                </div>
                                {userType === "new" && (
                                    <div className="space-y-1">
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="Enter password"
                                            value={personalData.password}
                                            onChange={e => setPersonalData(p => ({ ...p, password: e.target.value }))}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label>First Name</Label>
                                    <Input
                                        placeholder="First Name"
                                        value={personalData.firstName}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, firstName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Last Name</Label>
                                    <Input
                                        placeholder="Last Name"
                                        value={personalData.lastName}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, lastName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Phone Number</Label>
                                    <Input
                                        placeholder="Phone Number"
                                        value={personalData.phoneNumber}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, phoneNumber: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Street Address</Label>
                                <Input
                                    placeholder="Street Address"
                                    value={personalData.address}
                                    disabled={userType === "existing"}
                                    onChange={e => setPersonalData(p => ({ ...p, address: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Country</Label>
                                    <SearchableSelect
                                        value={personalData.country}
                                        options={countryOptions}
                                        placeholder="Select Country"
                                        disabled={userType === "existing" || !geoLib}
                                        onChange={v => setPersonalData(p => ({ ...p, country: v, state: "", city: "" }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>State</Label>
                                    <SearchableSelect
                                        value={personalData.state}
                                        options={stateOptions}
                                        placeholder="Select State"
                                        disabled={userType === "existing" || !personalData.country || !geoLib}
                                        onChange={v => setPersonalData(p => ({ ...p, state: v, city: "" }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>City</Label>
                                    <SearchableSelect
                                        value={personalData.city}
                                        options={cityOptions}
                                        placeholder="Select City"
                                        disabled={userType === "existing" || !personalData.state || !geoLib}
                                        onChange={v => setPersonalData(p => ({ ...p, city: v }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Zip Code</Label>
                                    <Input
                                        placeholder="Zip"
                                        value={personalData.zipCode}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, zipCode: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Shipping */}
                            <div className="pt-4 border-t space-y-4">
                                <div className="font-semibold text-foreground">Appointment Details</div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Select Default Shipping Address</Label>
                                        <Select onValueChange={v => v === "same" && handleSameAsAbove()}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Default Shipping Address" />
                                            </SelectTrigger>
                                            <SelectContent className="z-[150] w-full">
                                                <SelectItem value="same">Same As Above</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Street Address</Label>
                                        <Input
                                            placeholder="Street Address"
                                            value={shippingData.shippingAddress}
                                            onChange={e => setShippingData(p => ({ ...p, shippingAddress: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>Country</Label>
                                            <SearchableSelect
                                                value={shippingData.shippingCountry}
                                                options={countryOptions}
                                                placeholder="Select Country"
                                                disabled={!geoLib}
                                                onChange={v => setShippingData(p => ({ ...p, shippingCountry: v, shippingState: "", shippingCity: "" }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>State</Label>
                                            <SearchableSelect
                                                value={shippingData.shippingState}
                                                options={shippingStateOptions}
                                                placeholder="Select State"
                                                disabled={!shippingData.shippingCountry || !geoLib}
                                                onChange={v => setShippingData(p => ({ ...p, shippingState: v, shippingCity: "" }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>City</Label>
                                            <SearchableSelect
                                                value={shippingData.shippingCity}
                                                options={shippingCityOptions}
                                                placeholder="Select City"
                                                disabled={!shippingData.shippingState || !geoLib}
                                                onChange={v => setShippingData(p => ({ ...p, shippingCity: v }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Zip Code</Label>
                                            <Input
                                                placeholder="Zip"
                                                value={shippingData.shippingZipCode}
                                                onChange={e => setShippingData(p => ({ ...p, shippingZipCode: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    {/* ── Choose Service ─────────────────────────────────── */}
                    <AccordionItem
                        title="Choose Service"
                        isOpen={sections.service}
                        onToggle={() => toggleSection("service")}
                    >
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-primary">Choose Service</Label>
                                <RadioGroup onValueChange={handleServiceSelect}>
                                    <div className="flex flex-wrap gap-6">
                                        {services.map(service => (
                                            <div key={service._id} className="flex items-center space-x-2">
                                                <RadioGroupItem value={service._id} id={`service-${service._id}`} />
                                                <Label htmlFor={`service-${service._id}`} className="cursor-pointer">
                                                    {service.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant={bookingType === "once" ? "default" : "outline"} onClick={() => setBookingType("once")}>Once</Button>
                                <Button variant={bookingType === "recurring" ? "default" : "outline"} onClick={() => setBookingType("recurring")}>Recurring</Button>
                            </div>

                            {bookingType === "recurring" && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Frequency</Label>
                                        <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent className="z-[150]">
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {frequency === "weekly" && (
                                        <div className="space-y-1">
                                            <Label>Select Days</Label>
                                            <div className="flex gap-2">
                                                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, i) => (
                                                    <Button
                                                        key={i}
                                                        size="sm"
                                                        variant={selectedDays.includes(i) ? "default" : "outline"}
                                                        onClick={() => toggleDay(i)}
                                                    >{day}</Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {frequency === "monthly" && (
                                        <div className="space-y-2">
                                            <Label>Day of week in Months</Label>
                                            <div className="space-y-1">
                                                {[1, 2, 3, 4, 5].map(weekNum => (
                                                    <div key={weekNum} className="flex gap-2">
                                                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, idx) => {
                                                            const dayIndex = [1, 2, 3, 4, 5, 6, 0][idx];
                                                            const active = monthlyWeeks.some(w => w.week === weekNum && w.dayOfWeek === dayIndex);
                                                            return (
                                                                <Button
                                                                    key={`${weekNum}-${d}`}
                                                                    size="sm"
                                                                    variant={active ? "default" : "outline"}
                                                                    onClick={() => toggleMonthlyWeekDay(weekNum, dayIndex)}
                                                                >{d}</Button>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <Label>Recurring End Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn("w-full justify-start text-left font-normal", !recurringEndDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {recurringEndDate ? format(new Date(recurringEndDate), "PPP") : <span>Select end date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={recurringEndDate ? new Date(recurringEndDate) : undefined}
                                                    onSelect={date => { if (date) setRecurringEndDate(format(date, "yyyy-MM-dd")); }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}

                            {selectedService?.subServices?.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-primary text-md">Sub Services</Label>
                                    {selectedService.subServices.map((sub: any) => (
                                        <div key={sub._id} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-green-600 font-medium">{sub.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700" onClick={() => updateQuantity(sub._id, -1, "sub")}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-8 text-center">{subServiceQuantities[sub._id] || 0}</span>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700" onClick={() => updateQuantity(sub._id, 1, "sub")}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedService?.addons?.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-primary">Addons</Label>
                                    {selectedService.addons.map((addon: any) => (
                                        <div key={addon._id} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-green-600 font-medium">{addon.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700" onClick={() => updateQuantity(addon._id, -1, "addon")}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-8 text-center">{addonQuantities[addon._id] || 0}</span>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700" onClick={() => updateQuantity(addon._id, 1, "addon")}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <Label className="text-base font-semibold">Technician(s)</Label>
                                <MultiSelect
                                    options={filteredTechnicians.map(t => ({ label: t.title, value: t.id, group: t.group }))}
                                    selected={selectedTechnicianIds}
                                    onChange={handleTechnicianChange}
                                    placeholder={!selectedService ? "Select a service first..." : "Select technicians..."}
                                    disabled={!selectedService}
                                />
                            </div>
                        </div>
                    </AccordionItem>

                    {/* ── Notes ─────────────────────────────────────────── */}
                    <div className="space-y-2 mt-3">
                        <Label className="text-md">Appointment Notes</Label>
                        <Textarea
                            placeholder="Add any special notes here..."
                            className="min-h-[100px] resize-none shadow-none"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    {/* ── Pricing ───────────────────────────────────────── */}
                    <div className="p-4 border rounded-md bg-card space-y-6 shadow-sm">
                        <h3 className="font-semibold text-md">Estimated Price</h3>
                        <div className="space-y-8">
                            {bookingType === "once" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-dashed mb-4">
                                    <div className="space-y-2">
                                        <Label>Start Date/Time</Label>
                                        <DateTimePicker date={bookingStart} setDate={(d: Date) => setBookingStart(d)} />
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
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 mb-2">
                                <div className="space-y-1">
                                    <Label>Total Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input value={total.toFixed(2)} className="pl-7 bg-muted" readOnly />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Promo Code</Label>
                                    <Select value={selectedPromocode} onValueChange={setSelectedPromocode}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Promo Code" /></SelectTrigger>
                                        <SelectContent className="z-[150]" position="popper">
                                            <SelectItem value="none">None</SelectItem>
                                            {promocodes
                                                .filter(p => p.limit === -1 || p.limit > 0)
                                                .map(promo => (
                                                    <SelectItem key={promo._id} value={promo.code}>
                                                        {promo.code} – {promo.type === "percentage" ? `${promo.value}%` : `$${promo.value}`}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Total Discount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input type="number" value={discount} readOnly className="pl-7 bg-muted" />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-dashed">
                                <div className="flex justify-between items-center">
                                    <span className="text-md font-semibold">Final Amount:</span>
                                    <span className="text-md font-bold">${finalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <SheetFooter className="p-4 border-t bg-muted/30 flex-col sm:flex-row gap-2 sm:items-center shrink-0">
                    <div className="flex-1 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-lg">Total: ${finalAmount.toFixed(2)}</span>
                            {durationInHours > 0 && (
                                <span className="text-sm text-muted-foreground">(${effectiveRate.toFixed(2)}/hr)</span>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 w-full sm:w-auto">
                        <Button variant="default" onClick={handleSubmit}>Create Booking</Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}