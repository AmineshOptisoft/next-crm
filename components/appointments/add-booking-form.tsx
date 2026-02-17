"use client";

import { toast } from "sonner";

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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Check, ChevronsUpDown, X, Calendar as CalendarIcon, DollarSign, Clock, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Country, State, City } from "country-state-city";
import { Promocode } from "@/components/company-settings/types";

// Accordion Item component
function AccordionItem({ title, isOpen, onToggle, children }: any) {
    return (
        <div className="border rounded-md bg-card mb-2 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
            >
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
}

interface AddBookingFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: {
        start: Date;
        end: Date;
        technicianId?: string;
    };
}

export function AddBookingForm({ open, onOpenChange, initialData }: AddBookingFormProps) {
    const [userType, setUserType] = useState("new");
    const [sections, setSections] = useState({
        personal: true,
        service: false
    });

    // ── FIX: Separate email into its own state so the debounce effect
    //    only fires when email changes, not on every other field keystroke.
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Data states
    const [contacts, setContacts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [allTechnicians, setAllTechnicians] = useState<any[]>([]);
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);

    // ── FIX: Split formData into two objects so that typing in personal
    //    fields doesn't re-run shipping-related memos and vice-versa.
    const [personalData, setPersonalData] = useState({
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

    const [shippingData, setShippingData] = useState({
        shippingAddress: "",
        shippingCountry: "United States",
        shippingCity: "",
        shippingState: "California",
        shippingZipCode: "",
    });

    const [notes, setNotes] = useState("");

    const [bookingType, setBookingType] = useState<"once" | "recurring">("once");
    const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [monthlyWeeks, setMonthlyWeeks] = useState<{ week: number; dayOfWeek: number }[]>([]);
    const [recurringEndDate, setRecurringEndDate] = useState("");

    const [bookingStart, setBookingStart] = useState<Date | undefined>(initialData?.start);
    const [bookingEnd, setBookingEnd] = useState<Date | undefined>(initialData?.end);

    useEffect(() => {
        if (initialData?.start) setBookingStart(initialData.start);
        if (initialData?.end) setBookingEnd(initialData.end);
    }, [initialData]);

    const [subServiceQuantities, setSubServiceQuantities] = useState<Record<string, number>>({});
    const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});

    const [discount, setDiscount] = useState(0);
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [selectedPromocode, setSelectedPromocode] = useState<string>("");

    // ── FIX: useCallback prevents AccordionItem's onToggle from being a
    //    new reference on every render, stopping unnecessary re-renders.
    const toggleSection = useCallback((key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    useEffect(() => {
        if (open && userType === "existing") fetchContacts();
    }, [open, userType]);

    useEffect(() => {
        if (open && initialData?.technicianId) {
            fetchTechnicianServices(initialData.technicianId);
            setSelectedTechnicianIds([initialData.technicianId]);
        }
    }, [open, initialData?.technicianId]);

    useEffect(() => {
        if (open) {
            fetchTechnicians();
            fetchPromocodes();
        }
    }, [open]);

    const fetchTechnicians = async () => {
        try {
            const res = await fetch('/api/appointments/resources');
            const data = await res.json();
            setAllTechnicians(data.resources || []);
        } catch (error) {
            console.error("Failed to fetch technicians:", error);
        }
    };

    const fetchPromocodes = async () => {
        try {
            const res = await fetch('/api/promocodes');
            const data = await res.json();
            setPromocodes(data);
        } catch (error) {
            console.error("Failed to fetch promocodes:", error);
        }
    };

    // Auto-calculate end time
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

        if (totalMinutes > 0) {
            setBookingEnd(new Date(bookingStart.getTime() + totalMinutes * 60 * 1000));
        } else if (selectedService.estimatedTime) {
            setBookingEnd(new Date(bookingStart.getTime() + selectedService.estimatedTime * 60 * 1000));
        } else {
            setBookingEnd(new Date(bookingStart.getTime() + 60 * 60 * 1000));
        }
    }, [selectedService, subServiceQuantities, addonQuantities, bookingStart]);

    // ── FIX: Effect now only depends on `email` (its own state) and
    //    `userType`, so typing in password/name/phone no longer triggers it.
    useEffect(() => {
        if (userType !== "new" || !email) {
            setEmailError("");
            setIsCheckingEmail(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
                const data = await response.json();
                setEmailError(
                    data.exists
                        ? "This email is already registered. Please use a different email or select 'Existing User'."
                        : ""
                );
            } catch (error) {
                console.error("Error checking email:", error);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [email, userType]);

    // ── FIX: Memoize filtered technicians — only recomputes when its
    //    actual dependencies change, not on every keystroke.
    const filteredTechnicians = useMemo(() => {
        if (!selectedService || !bookingStart || !bookingEnd) return [];

        const clickedTechnician = allTechnicians.find(t => t.id === initialData?.technicianId);
        const targetZone = clickedTechnician?.group;

        if (!targetZone) return allTechnicians;

        return allTechnicians.filter(tech => {
            if (tech.group !== targetZone) return false;
            if (tech.services && Array.isArray(tech.services)) {
                return tech.services.some((serviceId: any) =>
                    serviceId.toString() === selectedService._id.toString()
                );
            }
            return true;
        });
    }, [selectedService, bookingStart, bookingEnd, allTechnicians, initialData?.technicianId]);

    const fetchContacts = async () => {
        try {
            const res = await fetch('/api/contacts');
            const data = await res.json();
            setContacts(data);
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
        }
    };

    const fetchTechnicianServices = async (technicianId: string) => {
        try {
            const res = await fetch(`/api/users/${technicianId}/services`);
            const data = await res.json();
            setServices(data);
        } catch (error) {
            console.error("Failed to fetch services:", error);
        }
    };

    // ── FIX: useCallback so this handler isn't re-created on every render.
    const handleContactSelect = useCallback((contactId: string) => {
        const contact = contacts.find(c => c._id === contactId);
        if (contact) {
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
        }
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
        if (service) {
            setSelectedService(service);

            const subServicesQty: Record<string, number> = {};
            service.subServices?.forEach((sub: any) => { subServicesQty[sub._id] = 0; });
            setSubServiceQuantities(subServicesQty);

            const addonsQty: Record<string, number> = {};
            service.addons?.forEach((addon: any) => { addonsQty[addon._id] = 0; });
            setAddonQuantities(addonsQty);
        }
    }, [services]);

    // ── FIX: useCallback so quantity buttons don't recreate handlers each render.
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
            return exists
                ? prev.filter(w => !(w.week === week && w.dayOfWeek === dayOfWeek))
                : [...prev, { week, dayOfWeek }];
        });
    }, []);

    // ── FIX: Memoize price calculation so it only reruns when pricing
    //    inputs change, not on personal-field keystrokes.
    const { total, subTotal, addonsTotal } = useMemo(() => {
        if (!selectedService) return { total: 0, subTotal: 0, addonsTotal: 0 };

        const totalBookingHours = bookingStart && bookingEnd
            ? (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60)
            : 0;

        const calculateItemPrice = (item: any, quantity: number = 1, defaultHours: number = 0) => {
            const B = Number(item.basePrice) || 0;
            const H = Number(item.hourlyRate) || 0;
            const R = Number(item.rangePercentage) || 0;
            const T_minutes = item.estimatedTime ? Number(item.estimatedTime) : defaultHours * 60;
            const hoursPerUnit = T_minutes / 60;
            const totalLaborCost = H * hoursPerUnit * quantity;
            const subtotal = B + totalLaborCost;
            return subtotal * (1 + R / 100);
        };

        let subTotal = 0;
        let addonsTotal = 0;

        selectedService.subServices?.forEach((sub: any) => {
            const qty = subServiceQuantities[sub._id] || 0;
            if (qty > 0) subTotal += calculateItemPrice(sub, qty, totalBookingHours);
        });

        selectedService.addons?.forEach((addon: any) => {
            const qty = addonQuantities[addon._id] || 0;
            if (qty > 0) addonsTotal += calculateItemPrice(addon, qty, totalBookingHours);
        });

        return { total: subTotal + addonsTotal, subTotal, addonsTotal };
    }, [selectedService, subServiceQuantities, addonQuantities, bookingStart, bookingEnd]);

    useEffect(() => {
        if (selectedPromocode && selectedPromocode !== "none") {
            const promo = promocodes.find(p => p.code === selectedPromocode);
            if (promo) {
                let val = promo.type === 'percentage'
                    ? total * (Number(promo.value) / 100)
                    : Number(promo.value);
                setDiscount(Number(Math.min(val, total).toFixed(2)));
            }
        } else if (selectedPromocode === "none") {
            setDiscount(0);
        }
    }, [selectedPromocode, total, promocodes]);

    const finalAmount = total - discount;

    const durationInHours = bookingStart && bookingEnd
        ? (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60)
        : 0;
    const effectiveRate = durationInHours > 0 ? finalAmount / durationInHours : 0;

    // ── FIX: Memoize country/state/city lookups — these iterate large
    //    datasets and were recalculating on every single keystroke before.
    const countries = useMemo(() => Country.getAllCountries(), []);

    const { states, cities } = useMemo(() => {
        const selectedCountry = countries.find(c => c.name === personalData.country);
        const countryCode = selectedCountry?.isoCode;
        const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
        const selectedState = states.find(s => s.name === personalData.state);
        const stateCode = selectedState?.isoCode;
        const cities = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];
        return { states, cities };
    }, [personalData.country, personalData.state, countries]);

    const { shippingStates, shippingCities } = useMemo(() => {
        const selectedCountry = countries.find(c => c.name === shippingData.shippingCountry);
        const countryCode = selectedCountry?.isoCode;
        const shippingStates = countryCode ? State.getStatesOfCountry(countryCode) : [];
        const selectedState = shippingStates.find(s => s.name === shippingData.shippingState);
        const stateCode = selectedState?.isoCode;
        const shippingCities = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];
        return { shippingStates, shippingCities };
    }, [shippingData.shippingCountry, shippingData.shippingState, countries]);

    // Memoize Options to prevent re-rendering massive lists on every keystroke
    const contactOptions = useMemo(() => contacts.map(contact => (
        <SelectItem key={contact._id} value={contact._id}>
            {contact.firstName} {contact.lastName} - {contact.email}
        </SelectItem>
    )), [contacts]);

    const countryOptions = useMemo(() => countries.map((country) => (
        <SelectItem key={country.isoCode} value={country.name}>{country.name}</SelectItem>
    )), [countries]);

    const stateOptions = useMemo(() => states.map((state) => (
        <SelectItem key={state.isoCode} value={state.name}>{state.name}</SelectItem>
    )), [states]);

    const cityOptions = useMemo(() => cities.map((city) => (
        <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
    )), [cities]);

    const shippingStateOptions = useMemo(() => shippingStates.map((state) => (
        <SelectItem key={state.isoCode} value={state.name}>{state.name}</SelectItem>
    )), [shippingStates]);

    const shippingCityOptions = useMemo(() => shippingCities.map((city) => (
        <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
    )), [shippingCities]);

    const handleSubmit = async () => {
        try {
            let contactId = selectedContact?._id;
            let newContactData = null;

            if (userType === "new") {
                if (emailError) {
                    toast.error("Please fix the email error before submitting");
                    return;
                }
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
                if (!recurringEndDate?.trim()) {
                    toast.error("Please set a recurring end date");
                    return;
                }
                if (frequency === "monthly" && !monthlyWeeks.length) {
                    toast.error("Please select at least one week/day combination");
                    return;
                }
                if (frequency === "weekly" && !selectedDays.length) {
                    toast.error("Please select at least one day for recurrence");
                    return;
                }
            }

            const subServices = Object.entries(subServiceQuantities)
                .filter(([_, qty]) => qty > 0)
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));

            const addons = Object.entries(addonQuantities)
                .filter(([_, qty]) => qty > 0)
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));

            const bookingData = {
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
            };

            const bookingRes = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            });

            if (!bookingRes.ok) {
                const errorData = await bookingRes.json();
                throw new Error(errorData.error || "Failed to create booking");
            }

            toast.success(bookingType === "once"
                ? "Booking created successfully!"
                : "Recurring bookings created successfully!");

            onOpenChange(false);
            window.location.reload();
        } catch (error: any) {
            console.error("Booking creation error:", error);
            toast.error(error.message || "Failed to create booking. Please try again.");
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col z-[100]">
                <SheetHeader className="p-4 border-b gap-0">
                    <SheetTitle>Add Manual Booking</SheetTitle>
                    <SheetDescription>Enter appointment and customer details below.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* Personal Details Accordion */}
                    <AccordionItem
                        title="Your Personal Details"
                        isOpen={sections.personal}
                        onToggle={() => toggleSection('personal')}
                    >
                        <div className="space-y-6">
                            <RadioGroup value={userType} className="flex gap-6" onValueChange={setUserType}>
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a contact" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]" position="popper">
                                            {contactOptions}
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
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={userType === "existing"}
                                            className={emailError ? "border-red-500" : ""}
                                        />
                                        {isCheckingEmail && userType === "new" && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
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
                                            onChange={(e) => setPersonalData(prev => ({ ...prev, password: e.target.value }))}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label>First Name</Label>
                                    <Input
                                        placeholder="First Name"
                                        value={personalData.firstName}
                                        onChange={(e) => setPersonalData(prev => ({ ...prev, firstName: e.target.value }))}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Last Name</Label>
                                    <Input
                                        placeholder="Last Name"
                                        value={personalData.lastName}
                                        onChange={(e) => setPersonalData(prev => ({ ...prev, lastName: e.target.value }))}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Phone Number</Label>
                                    <Input
                                        placeholder="Phone Number"
                                        value={personalData.phoneNumber}
                                        onChange={(e) => setPersonalData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Street Address</Label>
                                <Input
                                    placeholder="Street Address"
                                    value={personalData.address}
                                    onChange={(e) => setPersonalData(prev => ({ ...prev, address: e.target.value }))}
                                    disabled={userType === "existing"}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Country</Label>
                                    <Select
                                        value={personalData.country}
                                        onValueChange={(value) => setPersonalData(prev => ({ ...prev, country: value, state: "", city: "" }))}
                                        disabled={userType === "existing"}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Country" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]">
                                            {countryOptions}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>State</Label>
                                    <Select
                                        value={personalData.state}
                                        onValueChange={(value) => setPersonalData(prev => ({ ...prev, state: value, city: "" }))}
                                        disabled={userType === "existing" || !personalData.country}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select State" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]">
                                            {stateOptions}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>City</Label>
                                    <Select
                                        value={personalData.city}
                                        onValueChange={(value) => setPersonalData(prev => ({ ...prev, city: value }))}
                                        disabled={userType === "existing" || !personalData.state}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select City" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]">
                                            {cityOptions}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Zip Code</Label>
                                    <Input
                                        placeholder="Zip"
                                        value={personalData.zipCode}
                                        onChange={(e) => setPersonalData(prev => ({ ...prev, zipCode: e.target.value }))}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                            </div>

                            {/* Shipping Address Section */}
                            <div className="pt-4 border-t space-y-4">
                                <div className="font-semibold text-foreground">Appointment Details</div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Select Default Shipping Address</Label>
                                        <Select onValueChange={(value) => value === "same" && handleSameAsAbove()}>
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
                                            onChange={(e) => setShippingData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>Country</Label>
                                            <Select
                                                value={shippingData.shippingCountry}
                                                onValueChange={(value) => setShippingData(prev => ({ ...prev, shippingCountry: value, shippingState: "", shippingCity: "" }))}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Country" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[150]">
                                                    {countryOptions}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>State</Label>
                                            <Select
                                                value={shippingData.shippingState}
                                                onValueChange={(value) => setShippingData(prev => ({ ...prev, shippingState: value, shippingCity: "" }))}
                                                disabled={!shippingData.shippingCountry}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select State" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[150]">
                                                    {shippingStateOptions}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>City</Label>
                                            <Select
                                                value={shippingData.shippingCity}
                                                onValueChange={(value) => setShippingData(prev => ({ ...prev, shippingCity: value }))}
                                                disabled={!shippingData.shippingState}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select City" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[150]">
                                                    {shippingCityOptions}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Zip Code</Label>
                                            <Input
                                                placeholder="Zip"
                                                value={shippingData.shippingZipCode}
                                                onChange={(e) => setShippingData(prev => ({ ...prev, shippingZipCode: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    {/* Choose Service Accordion */}
                    <AccordionItem
                        title="Choose Service"
                        isOpen={sections.service}
                        onToggle={() => toggleSection('service')}
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
                                <Button
                                    variant={bookingType === "once" ? "default" : "outline"}
                                    onClick={() => setBookingType("once")}
                                >
                                    Once
                                </Button>
                                <Button
                                    variant={bookingType === "recurring" ? "default" : "outline"}
                                    onClick={() => setBookingType("recurring")}
                                >
                                    Recurring
                                </Button>
                            </div>

                            {bookingType === "recurring" && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Frequency</Label>
                                        <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
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
                                                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, index) => (
                                                    <Button
                                                        key={index}
                                                        size="sm"
                                                        variant={selectedDays.includes(index) ? "default" : "outline"}
                                                        onClick={() => toggleDay(index)}
                                                    >
                                                        {day}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {frequency === "monthly" && (
                                        <div className="space-y-2">
                                            <Label>Day of week in Months</Label>
                                            <div className="space-y-1">
                                                {[1, 2, 3, 4, 5].map((weekNumber) => (
                                                    <div key={weekNumber} className="flex gap-2">
                                                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((dayLabel, idx) => {
                                                            const dayIndexMap = [1, 2, 3, 4, 5, 6, 0];
                                                            const dayIndex = dayIndexMap[idx];
                                                            const isSelected = monthlyWeeks.some(
                                                                (w) => w.week === weekNumber && w.dayOfWeek === dayIndex
                                                            );
                                                            return (
                                                                <Button
                                                                    key={`${weekNumber}-${dayLabel}`}
                                                                    size="sm"
                                                                    variant={isSelected ? "default" : "outline"}
                                                                    onClick={() => toggleMonthlyWeekDay(weekNumber, dayIndex)}
                                                                >
                                                                    {dayLabel}
                                                                </Button>
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
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !recurringEndDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {recurringEndDate
                                                        ? format(new Date(recurringEndDate), "PPP")
                                                        : <span>Select end date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={recurringEndDate ? new Date(recurringEndDate) : undefined}
                                                    onSelect={(date) => {
                                                        if (date) setRecurringEndDate(format(date, "yyyy-MM-dd"));
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}

                            {selectedService && selectedService.subServices?.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-primary text-md">Sub Services</Label>
                                    {selectedService.subServices.map((sub: any) => (
                                        <div key={sub._id} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-green-600 font-medium">{sub.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700"
                                                    onClick={() => updateQuantity(sub._id, -1, "sub")}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-8 text-center">{subServiceQuantities[sub._id] || 0}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700"
                                                    onClick={() => updateQuantity(sub._id, 1, "sub")}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedService && selectedService.addons?.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-primary">Addons</Label>
                                    {selectedService.addons.map((addon: any) => (
                                        <div key={addon._id} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-green-600 font-medium">{addon.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700"
                                                    onClick={() => updateQuantity(addon._id, -1, "addon")}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-8 text-center">{addonQuantities[addon._id] || 0}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-full bg-green-600 text-white hover:bg-green-700"
                                                    onClick={() => updateQuantity(addon._id, 1, "addon")}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
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
                                    onChange={setSelectedTechnicianIds}
                                    placeholder={!selectedService ? "Select a service first..." : "Select technicians..."}
                                    disabled={!selectedService}
                                />
                            </div>
                        </div>
                    </AccordionItem>

                    {/* Appointment Notes */}
                    <div className="space-y-2 mt-3">
                        <Label className="text-md">Appointment Notes</Label>
                        <Textarea
                            placeholder="Add any special notes here..."
                            className="min-h-[100px] resize-none shadow-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Estimated Price Section */}
                    <div className="p-4 border rounded-md bg-card space-y-6 shadow-sm">
                        <h3 className="font-semibold text-md">Estimated Price</h3>

                        <div className="space-y-8">
                            {bookingType === "once" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-dashed mb-4">
                                    <div className="space-y-2">
                                        <Label>Start Date/Time</Label>
                                        <DateTimePicker
                                            date={bookingStart}
                                            setDate={(d: Date) => setBookingStart(d)}
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
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Promo Code" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]" position="popper">
                                            <SelectItem value="none">None</SelectItem>
                                            {promocodes.map((promo) => (
                                                <SelectItem key={promo._id} value={promo.code}>
                                                    {promo.code} - {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Total Discount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={discount}
                                            readOnly
                                            className="pl-7 bg-muted"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed space-y-4">
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
                                <span className="text-sm text-muted-foreground">
                                    (${effectiveRate.toFixed(2)}/hr)
                                </span>
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