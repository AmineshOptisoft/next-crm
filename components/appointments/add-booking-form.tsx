"use client";

import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { useEvents } from "@/context/events-context";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Calendar as CalendarIcon, DollarSign, ChevronDown, ChevronUp, Plus, Minus, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Promocode } from "@/components/company-settings/types";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());
const TECHNICIAN_BOOKING_BUFFER_MINUTES = 30;

// Helper: service (main, sub, or addon) is available for the selected user type (new vs existing)
function isServiceAvailableForUserType(
    availability: string | undefined,
    userType: "new" | "existing"
): boolean {
    if (!availability) return true;
    if (availability === "both" || availability === "admin_service") return true;
    if (userType === "new" && availability === "new_client") return true;
    if (userType === "existing" && availability === "existing_client") return true;
    return false;
}

// ─── Lazy-load country-state-city once — never blocks the JS bundle ───────────
let geoCache: any = null;
async function loadGeo() {
    if (geoCache) return geoCache;
    geoCache = await import("country-state-city");
    return geoCache;
}

// ─── VirtualGeoSelect ─────────────────────────────────────────────────────────
//
//  Optimized, virtualized dropdown that visually matches a standard shadcn
//  <Select> list (no search bar) while only rendering the visible rows.
//
const ITEM_H = 36; // px — height of each option row
const LIST_H = 288; // px — max visible height (~8 rows)

const VirtualGeoSelect = memo(function VirtualGeoSelect({
    id,
    value,
    onChange,
    options,
    placeholder,
    disabled,
}: {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const scrollRef       = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [typeAhead, setTypeAhead] = useState("");
    const [lastTypeTime, setLastTypeTime] = useState(0);

    // Virtual window calculations based on full options list
    const totalH       = options.length * ITEM_H;
    const startIdx     = Math.floor(scrollTop / ITEM_H);
    const visibleCount = Math.ceil(LIST_H / ITEM_H) + 2;               // +2 overscan
    const endIdx       = Math.min(startIdx + visibleCount, options.length);
    const visibleItems = options.slice(startIdx, endIdx);
    const offsetY      = startIdx * ITEM_H;

    const displayLabel = useMemo(
        () => options.find(o => o.value === value)?.label ?? "",
        [options, value]
    );

    // Simple type-to-jump behaviour: when user types letters while the
    // dropdown is open, scroll to the next option whose label starts
    // with the typed prefix.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
        if (!open) return;
        const key = e.key;
        if (key.length === 1 && /^[a-z0-9]$/i.test(key)) {
            const now = Date.now();
            const withinWindow = now - lastTypeTime < 700;
            const nextPrefix = (withinWindow ? typeAhead + key : key).toLowerCase();
            setTypeAhead(nextPrefix);
            setLastTypeTime(now);

            const idx = options.findIndex(o =>
                o.label.toLowerCase().startsWith(nextPrefix)
            );
            if (idx >= 0 && scrollRef.current) {
                const visibleHeight = Math.min(totalH, LIST_H);
                let newTop = idx * ITEM_H - visibleHeight / 2;
                newTop = Math.max(0, Math.min(newTop, Math.max(0, totalH - visibleHeight)));
                scrollRef.current.scrollTop = newTop;
                setScrollTop(newTop);
            }
        }
    };

    // Reset scroll each time the dropdown opens
    useEffect(() => {
        if (open) {
            setScrollTop(0);
            scrollRef.current?.scrollTo(0, 0);
        }
    }, [open]);

    // Close on outside click
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger — pixel-perfect match to shadcn SelectTrigger */}
            <button
                id={id}
                type="button"
                onKeyDown={handleKeyDown}
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm",
                    "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                )}
            >
                <span className={cn("truncate text-left", !displayLabel && "text-muted-foreground")}>
                    {displayLabel || placeholder}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-[200] mt-1 w-full rounded-md border bg-popover shadow-md">
                    {/* Virtual scroll container */}
                    <div
                        ref={scrollRef}
                        style={{ height: Math.min(totalH, LIST_H), overflowY: "auto", scrollbarWidth: "none" }}
                        className="scrollbar-none"
                        onKeyDown={handleKeyDown}
                        onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
                    >
                        {options.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</div>
                        ) : (
                            /* Outer div holds full scroll height; inner div is offset to show only visible rows */
                            <div style={{ height: totalH, position: "relative" }}>
                                <div style={{ position: "absolute", top: offsetY, width: "100%" }}>
                                    {visibleItems.map(opt => (
                                        <div
                                            key={opt.value}
                                            style={{ height: ITEM_H }}
                                            onClick={() => { onChange(opt.value); setOpen(false); }}
                                            className={cn(
                                                "flex items-center gap-2 px-3 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                                                value === opt.value && "bg-accent font-medium"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4 shrink-0", value === opt.value ? "opacity-100" : "opacity-0")} />
                                            {opt.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

// ─── AccordionItem ─────────────────────────────────────────────────────────────
const AccordionItem = memo(function AccordionItem({
    title, isOpen, onToggle, children,
}: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <div className="border rounded-md bg-card mb-2">
            <button type="button" onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors">
                <span className="font-medium text-foreground">{title}</span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t bg-card animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
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

const defaultPersonal = () => ({
    password: "",
    confirmPassword: "",
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
    shippingAddress: "", shippingCountry: "United States",
    shippingCity: "", shippingState: "California", shippingZipCode: "",
});

// ─── Main component ──────────────────────────────────────────────────────────
export function AddBookingForm({ open, onOpenChange, initialData, technicians, calendarEvents: calendarEventsProp }: AddBookingFormProps) {
    const { mutate } = useSWRConfig();

    const [sections, setSections]               = useState({ personal: true, service: false });
    const [userType, setUserType]               = useState<"new" | "existing">("new");
    const [email, setEmail]                     = useState("");
    const [emailError, setEmailError]           = useState("");
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [geoLib, setGeoLib]                   = useState<any>(null);

    // Load geo lib once in background
    useEffect(() => { loadGeo().then(setGeoLib); }, []);

    const [selectedTechnicianServiceId, setSelectedTechnicianServiceId] = useState<string | null>(initialData?.technicianId ?? null);
    const allTechnicians: any[] = technicians || [];
    const calendarEvents: any[] = calendarEventsProp || [];

    const { data: contactsData }  = useSWR(open && userType === "existing" ? "/api/contacts" : null, fetcher, { revalidateOnFocus: false });
    const contacts: any[]         = contactsData || [];

    const { data: promocodesData } = useSWR(open ? "/api/promocodes" : null, fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
    const promocodes: Promocode[]  = promocodesData || [];

    const { data: servicesData } = useSWR(
        open && selectedTechnicianServiceId ? `/api/users/${selectedTechnicianServiceId}/services` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60_000, revalidateOnMount: false }
    );
    const services: any[] = servicesData || [];

    const [selectedContact, setSelectedContact]         = useState<any>(null);
    const [selectedService, setSelectedService]         = useState<any>(null);
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>(initialData?.technicianId ? [initialData.technicianId] : []);
    const [personalData, setPersonalData]               = useState(defaultPersonal);
    const [shippingData, setShippingData]               = useState(defaultShipping);
    const [notes, setNotes]                             = useState("");
    const [bookingType, setBookingType]                 = useState<"once" | "recurring">("once");
    const [frequency, setFrequency]                     = useState<"weekly" | "monthly">("weekly");
    const [selectedDays, setSelectedDays]               = useState<number[]>([]);
    const [monthlyWeeks, setMonthlyWeeks]               = useState<{ week: number; dayOfWeek: number }[]>([]);
    const [recurringEndDate, setRecurringEndDate]       = useState("");
    const [bookingStart, setBookingStart]               = useState<Date | undefined>(initialData?.start);
    const [bookingEnd, setBookingEnd]                   = useState<Date | undefined>(initialData?.end);
    const [subServiceQuantities, setSubServiceQuantities] = useState<Record<string, number>>({});
    const [addonQuantities, setAddonQuantities]         = useState<Record<string, number>>({});
    const [discount, setDiscount]                       = useState(0);
    const [selectedPromocode, setSelectedPromocode]     = useState<string>("");
    const [isSubmitting, setIsSubmitting]               = useState(false);
    const [formErrors, setFormErrors]                   = useState<Record<string, string>>({});

    // Reset on close
    useEffect(() => {
        if (!open) {
            setUserType("new"); setEmail(""); setEmailError("");
            setSections({ personal: true, service: false });
            setSelectedContact(null); setSelectedService(null);
            setPersonalData(defaultPersonal()); setShippingData(defaultShipping());
            setNotes(""); setBookingType("once"); setFrequency("weekly");
            setSelectedDays([]); setMonthlyWeeks([]); setRecurringEndDate("");
            setSubServiceQuantities({}); setAddonQuantities({});
            setDiscount(0); setSelectedPromocode("");
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            if (initialData?.start) setBookingStart(initialData.start);
            if (initialData?.end)   setBookingEnd(initialData.end);
            if (initialData?.technicianId) {
                setSelectedTechnicianServiceId(initialData.technicianId);
                setSelectedTechnicianIds([initialData.technicianId]);
            }
        }
    }, [open, initialData?.start, initialData?.end, initialData?.technicianId, calendarEvents]);

    const toggleSection = useCallback((key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Email debounce check
    useEffect(() => {
        if (userType !== "new" || !email) { setEmailError(""); setIsCheckingEmail(false); return; }
        const id = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const res  = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
                const data = await res.json();
                setEmailError(data.exists ? "This email is already registered. Please use a different email or select 'Existing User'." : "");
            } catch { /* ignore */ } finally { setIsCheckingEmail(false); }
        }, 2000);
        return () => clearTimeout(id);
    }, [email, userType]);

    // ── Geo options — memoized, built from lazy lib ───────────────────────────
    const countryOptions = useMemo(() => {
        if (!geoLib) return [];
        return geoLib.Country.getAllCountries().map((c: any) => ({ label: c.name, value: c.name, isoCode: c.isoCode }));
    }, [geoLib]);

    // Cache the country isoCode lookup so state/city memos don't re-iterate all countries
    const personalCountryCode = useMemo(() => {
        return countryOptions.find((c: any) => c.value === personalData.country)?.isoCode ?? "";
    }, [countryOptions, personalData.country]);

    const shippingCountryCode = useMemo(() => {
        return countryOptions.find((c: any) => c.value === shippingData.shippingCountry)?.isoCode ?? "";
    }, [countryOptions, shippingData.shippingCountry]);

    const stateOptions = useMemo(() => {
        if (!geoLib || !personalCountryCode) return [];
        return geoLib.State.getStatesOfCountry(personalCountryCode).map((s: any) => ({ label: s.name, value: s.name, isoCode: s.isoCode }));
    }, [geoLib, personalCountryCode]);

    const cityOptions = useMemo(() => {
        if (!geoLib || !personalCountryCode || !personalData.state) return [];
        const stateCode = stateOptions.find((s: any) => s.value === personalData.state)?.isoCode;
        if (!stateCode) return [];
        return geoLib.City.getCitiesOfState(personalCountryCode, stateCode).map((c: any) => ({ label: c.name, value: c.name }));
    }, [geoLib, personalCountryCode, personalData.state, stateOptions]);

    const shippingStateOptions = useMemo(() => {
        if (!geoLib || !shippingCountryCode) return [];
        const states = geoLib.State.getStatesOfCountry(shippingCountryCode).map((s: any) => ({ label: s.name, value: s.name, isoCode: s.isoCode }));
        const currentState = shippingData.shippingState?.trim();
        if (currentState && !states.some((s: any) => s.value === currentState)) {
            states.unshift({ label: currentState, value: currentState, isoCode: "" });
        }
        return states;
    }, [geoLib, shippingCountryCode, shippingData.shippingState]);

    const shippingCityOptions = useMemo(() => {
        if (!geoLib || !shippingCountryCode || !shippingData.shippingState) return [];
        const stateCode = shippingStateOptions.find((s: any) => s.value === shippingData.shippingState)?.isoCode;
        const currentCity = shippingData.shippingCity?.trim();
        if (!stateCode) {
            return currentCity ? [{ label: currentCity, value: currentCity }] : [];
        }
        const cities = geoLib.City.getCitiesOfState(shippingCountryCode, stateCode).map((c: any) => ({ label: c.name, value: c.name }));
        if (currentCity && !cities.some((c: any) => c.value === currentCity)) {
            cities.unshift({ label: currentCity, value: currentCity });
        }
        return cities;
    }, [geoLib, shippingCountryCode, shippingData.shippingState, shippingData.shippingCity, shippingStateOptions]);

    // Filtered technicians
    const filteredTechnicians = useMemo(() => {
        if (!selectedService || !bookingStart || !bookingEnd) return [];
        const targetZone = allTechnicians.find(t => t.id === initialData?.technicianId)?.group;
        const bookStart  = bookingStart.getTime();
        const bookEnd    = bookingEnd.getTime();
        return allTechnicians.filter(tech => {
            if (targetZone && tech.group !== targetZone) return false;
            if (tech.services && !tech.services.some((id: any) => id.toString() === selectedService._id.toString())) return false;
            return !calendarEvents.some((ev: any) => {
                if (ev.resourceId !== tech.id) return false;
                if (ev.type !== "unavailability" && ev.type !== "unavailability_timed") return false;
                const evStart = new Date(ev.start).getTime();
                const evEnd   = new Date(ev.end).getTime();
                return bookStart < evEnd && bookEnd > evStart;
            });
        });
    }, [selectedService, bookingStart, bookingEnd, allTechnicians, initialData?.technicianId, calendarEvents]);

    // Main services: only show those available for the current user type (new vs existing)
    const filteredServices = useMemo(() => {
        return services.filter((s: any) =>
            isServiceAvailableForUserType(s.availability, userType)
        );
    }, [services, userType]);

    // Sub-services and addons: only show those available for the current user type
    const filteredSubServices = useMemo(() => {
        if (!selectedService?.subServices) return [];
        return selectedService.subServices.filter((sub: any) =>
            isServiceAvailableForUserType(sub.availability, userType)
        );
    }, [selectedService, userType]);

    const filteredAddons = useMemo(() => {
        if (!selectedService?.addons) return [];
        return selectedService.addons.filter((addon: any) =>
            isServiceAvailableForUserType(addon.availability, userType)
        );
    }, [selectedService, userType]);

    // When user type changes, clear selected service if it's no longer available for that type
    useEffect(() => {
        if (selectedService && filteredServices.length > 0) {
            const stillAvailable = filteredServices.some((s: any) => s._id === selectedService._id);
            if (!stillAvailable) {
                setSelectedService(null);
                setSubServiceQuantities({});
                setAddonQuantities({});
            }
        }
    }, [userType, filteredServices, selectedService]);

    // Auto-calculate end time (use only sub-services and addons available for current user type)
    useEffect(() => {
        if (!selectedService || !bookingStart) return;
        let totalMinutes = 0;
        filteredSubServices.forEach((sub: any) => {
            const qty = subServiceQuantities[sub._id] || 0;
            if (qty > 0 && sub.estimatedTime) totalMinutes += sub.estimatedTime * qty;
        });
        filteredAddons.forEach((addon: any) => {
            const qty = addonQuantities[addon._id] || 0;
            if (qty > 0 && addon.estimatedTime) totalMinutes += addon.estimatedTime * qty;
        });
        const techCount = Math.max(1, selectedTechnicianIds.length);
        if (totalMinutes > 0) {
            setBookingEnd(new Date(bookingStart.getTime() + (totalMinutes / techCount) * 60_000));
        } else if (selectedService.estimatedTime) {
            setBookingEnd(new Date(bookingStart.getTime() + (selectedService.estimatedTime / techCount) * 60_000));
        } else {
            setBookingEnd(new Date(bookingStart.getTime() + 3_600_000));
        }
    }, [selectedService, filteredSubServices, filteredAddons, subServiceQuantities, addonQuantities, bookingStart, selectedTechnicianIds.length]);

    // Handlers
    const handleTechnicianChange = useCallback((ids: string[]) => {
        setSelectedTechnicianIds(ids);
        if (ids.length > 0) setSelectedTechnicianServiceId(ids[0]);
    }, []);

    const handleContactSelect = useCallback((contactId: string) => {
        const contact = contacts.find(c => c._id === contactId);
        if (!contact) return;

        (async () => {
            try {
                const res = await fetch(`/api/contacts/${contactId}`);
                if (!res.ok) {
                    toast.error("Failed to load contact shipping addresses");
                    return;
                }
                const fullContact = await res.json();
                setSelectedContact(fullContact);
                setEmail(fullContact.email || "");
                setPersonalData(prev => ({
                    ...prev,
                    firstName: fullContact.firstName || "", lastName: fullContact.lastName || "",
                    phoneNumber: fullContact.phoneNumber || "", address: fullContact.address || "",
                    city: fullContact.city || "", state: fullContact.state || "California",
                    zipCode: fullContact.zipCode || "", country: fullContact.country || "United States",
                }));

                const defaultShip = fullContact.defaultShippingAddress || fullContact.shippingAddress;
                if (defaultShip?.street || defaultShip?.city || defaultShip?.state || defaultShip?.zipCode) {
                    setShippingData({
                        shippingAddress: defaultShip.street || "",
                        shippingCountry: defaultShip.country || "United States",
                        shippingCity: defaultShip.city || "",
                        shippingState: defaultShip.state || "California",
                        shippingZipCode: defaultShip.zipCode || "",
                    });
                }
            } catch (error) {
                console.error("Failed to fetch contact details:", error);
                toast.error("Failed to load contact details");
            }
        })();
    }, [contacts]);

    const handleSameAsAbove = useCallback(() => {
        setShippingData({
            shippingCountry: personalData.country, shippingAddress: personalData.address,
            shippingCity: personalData.city, shippingState: personalData.state, shippingZipCode: personalData.zipCode,
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
        setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }, []);

    const toggleMonthlyWeekDay = useCallback((week: number, dayOfWeek: number) => {
        setMonthlyWeeks(prev => {
            const exists = prev.some(w => w.week === week && w.dayOfWeek === dayOfWeek);
            return exists ? prev.filter(w => !(w.week === week && w.dayOfWeek === dayOfWeek)) : [...prev, { week, dayOfWeek }];
        });
    }, []);

    // Price calculation
    const { total, subTotal, addonsTotal } = useMemo(() => {
        if (!selectedService) return { total: 0, subTotal: 0, addonsTotal: 0 };
        const totalBookingHours = bookingStart && bookingEnd
            ? (bookingEnd.getTime() - bookingStart.getTime()) / 3_600_000 : 0;
        // Base price should be charged once per service line (not per unit).
        const calcPrice = (item: any, qty: number) => {
            const B     = Number(item.basePrice) || 0;
            const H     = Number(item.hourlyRate) || 0;
            const R     = Number(item.rangePercentage) || 0;
            const hours = item.estimatedTime ? Number(item.estimatedTime) / 60 : totalBookingHours;
            return (B + H * hours * qty) * (1 + R / 100);
        };
        let subTotal = 0, addonsTotal = 0;
        filteredSubServices.forEach((sub: any) => { const qty = subServiceQuantities[sub._id] || 0; if (qty > 0) subTotal += calcPrice(sub, qty); });
        filteredAddons.forEach((addon: any) => { const qty = addonQuantities[addon._id] || 0; if (qty > 0) addonsTotal += calcPrice(addon, qty); });
        return { total: subTotal + addonsTotal, subTotal, addonsTotal };
    }, [selectedService, filteredSubServices, filteredAddons, subServiceQuantities, addonQuantities, bookingStart, bookingEnd]);

    useEffect(() => {
        if (!selectedPromocode || selectedPromocode === "none") { setDiscount(0); return; }
        const promo = promocodes.find(p => p.code === selectedPromocode);
        if (!promo || promo.limit === 0) { setDiscount(0); if (promo?.limit === 0) setSelectedPromocode("none"); return; }
        const val = promo.type === "percentage" ? total * (Number(promo.value) / 100) : Number(promo.value);
        setDiscount(Number(Math.min(val, total).toFixed(2)));
    }, [selectedPromocode, total, promocodes]);

    const finalAmount     = total - discount;
    const durationInHours = bookingStart && bookingEnd ? (bookingEnd.getTime() - bookingStart.getTime()) / 3_600_000 : 0;
    const effectiveRate   = durationInHours > 0 ? finalAmount / durationInHours : 0;

    const contactSelectOptions = useMemo(() => contacts.map(c => (
        <SelectItem key={c._id} value={c._id}>{c.firstName} {c.lastName} – {c.email}</SelectItem>
    )), [contacts]);

    const shippingAddressOptions = useMemo(() => {
        const options: Array<{ value: string; label: string; address: any }> = [];
        const addresses = selectedContact?.shippingAddresses || [];
        const defaultAddress = selectedContact?.defaultShippingAddress || selectedContact?.shippingAddress;

        if (defaultAddress?.street || defaultAddress?.city || defaultAddress?.state || defaultAddress?.zipCode) {
            options.push({
                value: "default",
                label: `Default - ${[defaultAddress.street, defaultAddress.city, defaultAddress.state, defaultAddress.zipCode].filter(Boolean).join(", ")}`,
                address: defaultAddress,
            });
        }

        addresses.forEach((addr: any, index: number) => {
            const labelParts = [addr.title, addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
            options.push({
                value: `address-${index}`,
                label: labelParts.join(", "),
                address: addr,
            });
        });

        return options;
    }, [selectedContact]);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        try {
            const newErrors: Record<string, string> = {};

            let contactId = selectedContact?._id;
            let newContactData = null;
            if (userType === "new") {
                if (!email) newErrors.email = "Email is required";
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email address";
                if (emailError) newErrors.email = emailError;

                if (!personalData.password) newErrors.password = "Password is required";
                if (personalData.password && personalData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

                if (!personalData.confirmPassword) newErrors.confirmPassword = "Confirm Password is required";
                if (personalData.password && personalData.confirmPassword && personalData.password !== personalData.confirmPassword) {
                    newErrors.confirmPassword = "Password and Confirm Password do not match";
                }

                if (!personalData.firstName) newErrors.firstName = "First name is required";
                if (!personalData.lastName) newErrors.lastName = "Last name is required";

                if (!personalData.phoneNumber) newErrors.phoneNumber = "Phone number is required";

                if (!personalData.address) newErrors.address = "Street address is required";
                if (!personalData.city) newErrors.city = "City is required";
                if (!personalData.state) newErrors.state = "State is required";
                if (!personalData.zipCode) newErrors.zipCode = "Zip code is required";

                if (!shippingData.shippingAddress) newErrors.shippingAddress = "Shipping street address is required";
                if (!shippingData.shippingCity) newErrors.shippingCity = "Shipping city is required";
                if (!shippingData.shippingState) newErrors.shippingState = "Shipping state is required";
                if (!shippingData.shippingZipCode) newErrors.shippingZipCode = "Shipping zip code is required";

                if (Object.keys(newErrors).length > 0) {
                    setFormErrors(newErrors);
                    toast.error("Please fix the highlighted errors before submitting");
                    return;
                }

                setFormErrors({});

                newContactData = {
                    email, password: personalData.password,
                    firstName: personalData.firstName, lastName: personalData.lastName,
                    phone: personalData.phoneNumber, streetAddress: personalData.address,
                    country: personalData.country, city: personalData.city,
                    state: personalData.state, zipCode: personalData.zipCode, gender: personalData.gender,
                };
            }
            if ((!contactId && !newContactData) || !selectedService) { toast.error("Please select a contact and service"); return; }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!bookingStart) {
                toast.error("Please select a start date and time");
                return;
            }
            if (bookingStart < today) {
                toast.error("Booking start date cannot be before today");
                return;
            }
            if (bookingType === "recurring") {
                if (!recurringEndDate?.trim()) { toast.error("Please set a recurring end date"); return; }
                if (frequency === "monthly" && !monthlyWeeks.length) { toast.error("Please select at least one week/day combination"); return; }
                if (frequency === "weekly" && !selectedDays.length) { toast.error("Please select at least one day for recurrence"); return; }
            }
            if (!bookingEnd) {
                toast.error("Please select a valid booking time range");
                return;
            }
            if (bookingEnd <= bookingStart) {
                toast.error("Booking end time must be after the start time");
                return;
            }
            if (bookingStart && bookingEnd) {
                const bufferMs = TECHNICIAN_BOOKING_BUFFER_MINUTES * 60_000;
                for (const techId of selectedTechnicianIds) {
                    const violation = calendarEvents.find((ev: any) => {
                        if (ev.resourceId !== techId) return false;
                        if (ev.type !== "unavailability_timed" && ev.type !== "unavailability") return false;
                        const evStart = new Date(ev.start).getTime();
                        const evEnd   = new Date(ev.end).getTime();
                        return bookingStart.getTime() < evEnd && bookingEnd.getTime() > evStart;
                    });
                    if (violation) {
                        const techName = allTechnicians.find(t => t.id === techId)?.title || "A technician";
                        toast.error(`${techName}'s booking overlaps with their unavailable hours.`); return;
                    }

                    const bookingConflict = calendarEvents.find((ev: any) => {
                        if (ev.resourceId !== techId) return false;
                        if (ev.type !== "booking") return false;

                        const existingStart = new Date(ev.start).getTime();
                        const existingEnd = new Date(ev.end).getTime();
                        const newStart = bookingStart.getTime();
                        const newEnd = bookingEnd.getTime();

                        // No overlap allowed for the same technician.
                        const overlaps = newStart < existingEnd && newEnd > existingStart;
                        // Enforce a 30-minute gap after each existing booking ends.
                        const withinPostBookingBuffer = newStart >= existingEnd && newStart < existingEnd + bufferMs;

                        return overlaps || withinPostBookingBuffer;
                    });

                    if (bookingConflict) {
                        const techName = allTechnicians.find(t => t.id === techId)?.title || "Selected technician";
                        toast.error(`${techName} is not available for that time. A 30-minute buffer is required after each booking.`);
                        return;
                    }
                }
            }
            const allowedSubIds = new Set(filteredSubServices.map((s: any) => s._id.toString()));
            const allowedAddonIds = new Set(filteredAddons.map((a: any) => a._id.toString()));
            const subServices = Object.entries(subServiceQuantities)
                .filter(([id, qty]) => qty > 0 && allowedSubIds.has(id))
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));
            const addons = Object.entries(addonQuantities)
                .filter(([id, qty]) => qty > 0 && allowedAddonIds.has(id))
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));

            setIsSubmitting(true);
            const bookingRes  = await fetch("/api/bookings", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    newContact: newContactData, contactId,
                    technicianId: initialData?.technicianId, technicianIds: selectedTechnicianIds,
                    serviceId: selectedService._id, subServices, addons, bookingType,
                    frequency: bookingType === "recurring" ? frequency : undefined,
                    customRecurrence: bookingType === "recurring"
                        ? frequency === "monthly" ? { monthlyWeeks, endDate: recurringEndDate } : { selectedDays, endDate: recurringEndDate }
                        : undefined,
                    startDateTime: bookingStart, endDateTime: bookingEnd,
                    shippingAddress: { street: shippingData.shippingAddress, country: shippingData.shippingCountry, city: shippingData.shippingCity, state: shippingData.shippingState, zipCode: shippingData.shippingZipCode },
                    notes,
                    pricing: { baseAmount: selectedService.basePrice || selectedService.hourlyRate || 0, subServicesAmount: subTotal, addonsAmount: addonsTotal, totalAmount: total, discount, finalAmount, billedHours: 0 },
                    promoCode: selectedPromocode !== "none" ? selectedPromocode : undefined,
                }),
            });
            if (!bookingRes.ok) { const err = await bookingRes.json(); throw new Error(err.error || "Failed to create booking"); }
            toast.success(bookingType === "once" ? "Booking created successfully!" : "Recurring bookings created successfully!");
            onOpenChange(false);
            mutate((key) => typeof key === "string" && key.startsWith("/api/appointments/resources"), undefined, { revalidate: true });
        } catch (error: any) {
            toast.error(error.message || "Failed to create booking. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col z-[100]">
                <SheetHeader className="p-4 border-b gap-0">
                    <SheetTitle>Add Manual Booking</SheetTitle>
                    <SheetDescription>Enter appointment and customer details below.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                    {/* ── Personal Details ───────────────────────────────── */}
                    <AccordionItem title="Your Personal Details" isOpen={sections.personal} onToggle={() => toggleSection("personal")}>
                        <div className="space-y-6">
                            <RadioGroup value={userType} className="flex gap-6" onValueChange={v => setUserType(v as "new" | "existing")}>
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
                                <div className="space-y-2">
                                    <Label>Select Contact</Label>
                                    <Select onValueChange={handleContactSelect}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose a contact" /></SelectTrigger>
                                        <SelectContent className="z-[150]" position="popper">{contactSelectOptions}</SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Preferred Email</Label>
                                    <div className="relative">
                                        <Input id="email" placeholder="Enter email" value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            disabled={userType === "existing"}
                                            className={cn(formErrors.email || (emailError && userType === "new") ? "border-red-500" : "", "peer")} />
                                        {isCheckingEmail && userType === "new" && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                    {userType === "new" && (formErrors.email || emailError) && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.email || emailError}</p>
                                    )}
                                </div>
                                {userType === "new" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="Enter password"
                                                value={personalData.password}
                                                onChange={e => setPersonalData(p => ({ ...p, password: e.target.value }))}
                                                className={cn(formErrors.password ? "border-red-500" : "", "peer")}
                                            />
                                            {formErrors.password && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="Re-enter password"
                                                value={personalData.confirmPassword}
                                                onChange={e => setPersonalData(p => ({ ...p, confirmPassword: e.target.value }))}
                                                className={cn(formErrors.confirmPassword ? "border-red-500" : "", "peer")}
                                            />
                                            {formErrors.confirmPassword && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.confirmPassword}</p>
                                            )}
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        placeholder="First Name"
                                        value={personalData.firstName}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, firstName: e.target.value }))}
                                        className={cn(formErrors.firstName ? "border-red-500" : "", "peer")}
                                    />
                                    {formErrors.firstName && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.firstName}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        placeholder="Last Name"
                                        value={personalData.lastName}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, lastName: e.target.value }))}
                                        className={cn(formErrors.lastName ? "border-red-500" : "", "peer")}
                                    />
                                    {formErrors.lastName && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.lastName}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input
                                        id="phoneNumber"
                                        placeholder="Phone Number"
                                        value={personalData.phoneNumber}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, phoneNumber: e.target.value }))}
                                        className={cn(formErrors.phoneNumber ? "border-red-500" : "", "peer")}
                                    />
                                    {formErrors.phoneNumber && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.phoneNumber}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Street Address</Label>
                                <Textarea
                                    id="address"
                                    placeholder="Street Address"
                                    value={personalData.address}
                                    disabled={userType === "existing"}
                                    onChange={e => setPersonalData(p => ({ ...p, address: e.target.value }))}
                                    className={cn(formErrors.address ? "border-red-500" : "", "peer")}
                                />
                                {formErrors.address && (
                                    <p className="text-sm text-red-500 mt-1">{formErrors.address}</p>
                                )}
                            </div>

                            {/* Country / State / City / Zip — virtualized, no DOM blowup */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <VirtualGeoSelect id="country" value={personalData.country} options={countryOptions}
                                        placeholder="Select Country" disabled={userType === "existing" || !geoLib}
                                        onChange={v => setPersonalData(p => ({ ...p, country: v, state: "", city: "" }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <VirtualGeoSelect id="state" value={personalData.state} options={stateOptions}
                                        placeholder="Select State" disabled={userType === "existing" || !personalData.country || !geoLib}
                                        onChange={v => setPersonalData(p => ({ ...p, state: v, city: "" }))} />
                                    {formErrors.state && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.state}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <VirtualGeoSelect id="city" value={personalData.city} options={cityOptions}
                                        placeholder="Select City" disabled={userType === "existing" || !personalData.state || !geoLib}
                                        onChange={v => setPersonalData(p => ({ ...p, city: v }))} />
                                    {formErrors.city && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.city}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zipCode">Zip Code</Label>
                                    <Input
                                        id="zipCode"
                                        placeholder="Zip"
                                        value={personalData.zipCode}
                                        disabled={userType === "existing"}
                                        onChange={e => setPersonalData(p => ({ ...p, zipCode: e.target.value }))}
                                        className={cn(formErrors.zipCode ? "border-red-500" : "", "peer")}
                                    />
                                    {formErrors.zipCode && (
                                        <p className="text-sm text-red-500 mt-1">{formErrors.zipCode}</p>
                                    )}
                                </div>
                            </div>

                            {/* Shipping */}
                            <div className="pt-4 border-t space-y-4">
                                <div className="font-semibold text-foreground">Appointment Details</div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Select Default Shipping Address</Label>
                                        <Select onValueChange={v => {
                                            if (v === "same") {
                                                handleSameAsAbove();
                                                return;
                                            }
                                            const selected = shippingAddressOptions.find(opt => opt.value === v);
                                            if (!selected) return;
                                            const addr = selected.address || {};
                                            setShippingData({
                                                shippingAddress: addr.street || "",
                                                shippingCountry: addr.country || "United States",
                                                shippingCity: addr.city || "",
                                                shippingState: addr.state || "California",
                                                shippingZipCode: addr.zipCode || "",
                                            });
                                        }}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Default Shipping Address" /></SelectTrigger>
                                            <SelectContent className="z-[150] w-full">
                                                <SelectItem value="same">Same As Above</SelectItem>
                                                {shippingAddressOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="shippingAddress">Street Address</Label>
                                        <Textarea
                                            id="shippingAddress"
                                            placeholder="Street Address"
                                            value={shippingData.shippingAddress}
                                            onChange={e => setShippingData(p => ({ ...p, shippingAddress: e.target.value }))}
                                            className={cn(formErrors.shippingAddress ? "border-red-500" : "", "peer")}
                                        />
                                        {formErrors.shippingAddress && (
                                            <p className="text-sm text-red-500 mt-1">{formErrors.shippingAddress}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="shippingCountry">Country</Label>
                                            <VirtualGeoSelect id="shippingCountry" value={shippingData.shippingCountry} options={countryOptions}
                                                placeholder="Select Country" disabled={!geoLib}
                                                onChange={v => setShippingData(p => ({ ...p, shippingCountry: v, shippingState: "", shippingCity: "" }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="shippingState">State</Label>
                                            <VirtualGeoSelect id="shippingState" value={shippingData.shippingState} options={shippingStateOptions}
                                                placeholder="Select State" disabled={!shippingData.shippingCountry || !geoLib}
                                                onChange={v => setShippingData(p => ({ ...p, shippingState: v, shippingCity: "" }))} />
                                            {formErrors.shippingState && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.shippingState}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="shippingCity">City</Label>
                                            <VirtualGeoSelect id="shippingCity" value={shippingData.shippingCity} options={shippingCityOptions}
                                                placeholder="Select City" disabled={!shippingData.shippingState || !geoLib}
                                                onChange={v => setShippingData(p => ({ ...p, shippingCity: v }))} />
                                            {formErrors.shippingCity && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.shippingCity}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="shippingZipCode">Zip Code</Label>
                                            <Input
                                                id="shippingZipCode"
                                                placeholder="Zip"
                                                value={shippingData.shippingZipCode}
                                                onChange={e => setShippingData(p => ({ ...p, shippingZipCode: e.target.value }))}
                                                className={cn(formErrors.shippingZipCode ? "border-red-500" : "", "peer")}
                                            />
                                            {formErrors.shippingZipCode && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.shippingZipCode}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    {/* ── Choose Service ─────────────────────────────────── */}
                    <AccordionItem title="Choose Service" isOpen={sections.service} onToggle={() => toggleSection("service")}>
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-primary">Choose Service</Label>
                                <RadioGroup onValueChange={handleServiceSelect}>
                                    <div className="flex flex-wrap gap-6">
                                        {filteredServices.map(service => (
                                            <div key={service._id} className="flex items-center space-x-2">
                                                <RadioGroupItem value={service._id} id={`service-${service._id}`} />
                                                <Label htmlFor={`service-${service._id}`} className="cursor-pointer">{service.name}</Label>
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
                                    <div className="space-y-2">
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
                                        <div className="space-y-2">
                                            <Label>Select Days</Label>
                                            <div className="flex gap-2">
                                                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, i) => (
                                                    <Button key={i} size="sm" variant={selectedDays.includes(i) ? "default" : "outline"} onClick={() => toggleDay(i)}>{day}</Button>
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
                                                            return <Button key={`${weekNum}-${d}`} size="sm" variant={active ? "default" : "outline"} onClick={() => toggleMonthlyWeekDay(weekNum, dayIndex)}>{d}</Button>;
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Recurring End Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !recurringEndDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {recurringEndDate ? format(new Date(recurringEndDate), "PPP") : <span>Select end date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={recurringEndDate ? new Date(recurringEndDate) : undefined}
                                                    onSelect={date => { if (date) setRecurringEndDate(format(date, "yyyy-MM-dd")); }} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}

                            {selectedService && filteredSubServices.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-primary text-md">Sub Services</Label>
                                    {filteredSubServices.map((sub: any) => (
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

                            {selectedService && filteredAddons.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-primary">Addons</Label>
                                    {filteredAddons.map((addon: any) => (
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
                                    selected={selectedTechnicianIds} onChange={handleTechnicianChange}
                                    placeholder={!selectedService ? "Select a service first..." : "Select technicians..."}
                                    disabled={!selectedService} />
                            </div>
                        </div>
                    </AccordionItem>

                    {/* ── Notes ─────────────────────────────────────────── */}
                    <div className="space-y-2 mt-3">
                        <Label className="text-md">Appointment Notes</Label>
                        <Textarea placeholder="Add any special notes here..." className="min-h-[100px] resize-none shadow-none" value={notes} onChange={e => setNotes(e.target.value)} />
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
                                        <Input value={bookingEnd ? format(bookingEnd, "PPP HH:mm") : ""} readOnly className="bg-muted text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 mb-2">
                                <div className="space-y-2">
                                    <Label>Total Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input value={total.toFixed(2)} className="pl-7 bg-muted" readOnly />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Promo Code</Label>
                                    <Select value={selectedPromocode} onValueChange={setSelectedPromocode}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Promo Code" /></SelectTrigger>
                                        <SelectContent className="z-[150]" position="popper">
                                            <SelectItem value="none">None</SelectItem>
                                            {promocodes.filter(p => p.limit === -1 || p.limit > 0).map(promo => (
                                                <SelectItem key={promo._id} value={promo.code}>
                                                    {promo.code} – {promo.type === "percentage" ? `${promo.value}%` : `$${promo.value}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
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
                            {durationInHours > 0 && <span className="text-sm text-muted-foreground">(${effectiveRate.toFixed(2)}/hr)</span>}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 w-full sm:w-auto">
                        <Button variant="default" onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Creating..." : "Create Booking"}
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}