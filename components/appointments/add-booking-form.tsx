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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Check, ChevronsUpDown, X, Calendar as CalendarIcon, DollarSign, Clock, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

    // Data states
    const [contacts, setContacts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [allTechnicians, setAllTechnicians] = useState<any[]>([]); // Store all technicians
    const [filteredTechnicians, setFilteredTechnicians] = useState<any[]>([]); // Filtered list
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);

    // Form states
    const [formData, setFormData] = useState({
        // Personal details
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        address: "",
        city: "",
        state: "California",
        zipCode: "",
        gender: "Prefer not to say",

        // Shipping address
        shippingAddress: "",
        shippingCity: "",
        shippingState: "California",
        shippingZipCode: "",

        // Appointment
        notes: ""
    });

    const [bookingType, setBookingType] = useState<"once" | "recurring">("once");
    const [frequency, setFrequency] = useState<"weekly" | "monthly" | "custom">("weekly");
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [recurringEndDate, setRecurringEndDate] = useState("");

    // Date/Time States (Local)
    const [bookingStart, setBookingStart] = useState<Date | undefined>(initialData?.start);
    const [bookingEnd, setBookingEnd] = useState<Date | undefined>(initialData?.end);

    useEffect(() => {
        if (initialData?.start) setBookingStart(initialData.start);
        if (initialData?.end) setBookingEnd(initialData.end);
    }, [initialData]);

    // Sub-services and addons with quantities
    const [subServiceQuantities, setSubServiceQuantities] = useState<Record<string, number>>({});
    const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});

    // Pricing
    const [discount, setDiscount] = useState(0);

    const toggleSection = (key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Fetch contacts on mount
    useEffect(() => {
        if (open && userType === "existing") {
            fetchContacts();
        }
    }, [open, userType]);

    // Fetch services when technician is selected (using the primary/initial technician)
    useEffect(() => {
        if (open && initialData?.technicianId) {
            fetchTechnicianServices(initialData.technicianId);
            // Initialize selected technicians with the clicked one
            setSelectedTechnicianIds([initialData.technicianId]);
        }
    }, [open, initialData?.technicianId]);

    // Fetch all technicians
    useEffect(() => {
        if (open) {
            fetchTechnicians();
        }
    }, [open]);

    const fetchTechnicians = async () => {
        try {
            const res = await fetch('/api/appointments/resources');
            const data = await res.json();
            // Store all technicians for filtering
            setAllTechnicians(data.resources || []);
            setTechnicians(data.resources || []);
        } catch (error) {
            console.error("Failed to fetch technicians:", error);
        }
    };

    // Auto-calculate end time based on estimated times of selected services
    useEffect(() => {
        if (!selectedService || !bookingStart) return;

        let totalMinutes = 0;

        // Add estimated time from sub-services
        selectedService.subServices?.forEach((sub: any) => {
            const qty = subServiceQuantities[sub._id] || 0;
            if (qty > 0 && sub.estimatedTime) {
                totalMinutes += sub.estimatedTime * qty;
            }
        });

        // Add estimated time from addons
        selectedService.addons?.forEach((addon: any) => {
            const qty = addonQuantities[addon._id] || 0;
            if (qty > 0 && addon.estimatedTime) {
                totalMinutes += addon.estimatedTime * qty;
            }
        });

        // Calculate new end time
        // Default duration if no estimated time is 60 minutes (or keep existing logic)
        // If totalMinutes is 0, we can default to 1 hour or just keep current end time difference?
        // Let's assume if totalMinutes > 0 we update.

        if (totalMinutes > 0) {
            const newEndTime = new Date(bookingStart.getTime() + totalMinutes * 60 * 1000);
            setBookingEnd(newEndTime);
        } else if (bookingStart) {
            // Default 1 hour if nothing selected? Or keep original gap?
            // Lets keep original logic: if totalMinutes is 0, maybe don't change end time unless start changed?
            // If start changed, we want to maintain the DURATION or reset it?
            // Usually reset to +1 hour or similar.
            // For now, if totalMinutes is 0, we'll set it to Start + 1 hour as fallback or Start + Service Base Time?
            // Service might have `estimatedTime`.
            if (selectedService.estimatedTime) {
                const newEndTime = new Date(bookingStart.getTime() + selectedService.estimatedTime * 60 * 1000);
                setBookingEnd(newEndTime);
            } else {
                // Fallback 1 hour
                const newEndTime = new Date(bookingStart.getTime() + 60 * 60 * 1000);
                setBookingEnd(newEndTime);
            }
        }
    }, [selectedService, subServiceQuantities, addonQuantities, bookingStart]);

    // Filter technicians based on clicked technician's zone and selected service
    useEffect(() => {
        if (!selectedService || !bookingStart || !bookingEnd) {
            setFilteredTechnicians([]);
            return;
        }

        // Find the clicked technician's zone from initialData
        const clickedTechnicianId = initialData?.technicianId;
        const clickedTechnician = allTechnicians.find(t => t.id === clickedTechnicianId);
        const targetZone = clickedTechnician?.group;

        if (!targetZone) {
            // If no zone found, show all technicians (fallback)
            setFilteredTechnicians(allTechnicians);
            return;
        }

        // Filter technicians who:
        // 1. Are in the same zone as the clicked technician
        // 2. Have the selected service assigned to them
        const filtered = allTechnicians.filter(tech => {
            // Check if technician is in the same service area (zone)
            if (tech.group !== targetZone) {
                return false;
            }

            // Check if technician has the selected service assigned
            if (tech.services && Array.isArray(tech.services)) {
                const hasService = tech.services.some((serviceId: any) =>
                    serviceId.toString() === selectedService._id.toString()
                );
                if (!hasService) {
                    return false;
                }
            }

            return true;
        });

        setFilteredTechnicians(filtered);
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

    const handleContactSelect = (contactId: string) => {
        const contact = contacts.find(c => c._id === contactId);
        if (contact) {
            setSelectedContact(contact);
            setFormData({
                ...formData,
                email: contact.email || "",
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                phoneNumber: contact.phoneNumber || "",
                address: contact.address || "",
                city: contact.city || "",
                state: contact.state || "California",
                zipCode: contact.zipCode || ""
            });
        }
    };

    const handleSameAsAbove = () => {
        setFormData({
            ...formData,
            shippingAddress: formData.address,
            shippingCity: formData.city,
            shippingState: formData.state,
            shippingZipCode: formData.zipCode
        });
    };

    const handleServiceSelect = (serviceId: string) => {
        const service = services.find(s => s._id === serviceId);
        if (service) {
            setSelectedService(service);

            // Initialize sub-services quantities
            const subServicesQty: Record<string, number> = {};
            service.subServices?.forEach((sub: any) => {
                subServicesQty[sub._id] = 0;
            });
            setSubServiceQuantities(subServicesQty);

            // Initialize addons quantities
            const addonsQty: Record<string, number> = {};
            service.addons?.forEach((addon: any) => {
                addonsQty[addon._id] = 0;
            });
            setAddonQuantities(addonsQty);
        }
    };

    const updateQuantity = (id: string, delta: number, type: "sub" | "addon") => {
        if (type === "sub") {
            setSubServiceQuantities(prev => ({
                ...prev,
                [id]: Math.max(0, (prev[id] || 0) + delta)
            }));
        } else {
            setAddonQuantities(prev => ({
                ...prev,
                [id]: Math.max(0, (prev[id] || 0) + delta)
            }));
        }
    };

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const calculatePrice = () => {
        if (!selectedService) return { total: 0, subTotal: 0, addonsTotal: 0 };

        // Calculate hours from start and end time
        const hours = bookingStart && bookingEnd
            ? (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60)
            : 0;

        let total = 0; // Main service has no price
        let subTotal = 0;
        let addonsTotal = 0;

        // Add sub-services: basePrice + (hours × hourlyRate)
        selectedService.subServices?.forEach((sub: any) => {
            const qty = subServiceQuantities[sub._id] || 0;
            if (qty > 0) {
                const subServicePrice = (sub.basePrice || 0) + (hours * (sub.hourlyRate || 0));
                subTotal += subServicePrice * qty;
            }
        });

        // Add addons: basePrice + (hours × hourlyRate)
        selectedService.addons?.forEach((addon: any) => {
            const qty = addonQuantities[addon._id] || 0;
            if (qty > 0) {
                const addonPrice = (addon.basePrice || 0) + (hours * (addon.hourlyRate || 0));
                addonsTotal += addonPrice * qty;
            }
        });

        total = subTotal + addonsTotal;

        return { total, subTotal, addonsTotal };
    };

    const { total, subTotal, addonsTotal } = calculatePrice();
    const finalAmount = total - discount;

    const durationInHours = bookingStart && bookingEnd
        ? (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60)
        : 0;
    const effectiveRate = durationInHours > 0 ? finalAmount / durationInHours : 0;

    const handleSubmit = async () => {
        try {
            let contactId = selectedContact?._id;
            let newContactData = null;

            // Prepare new contact data if userType is "new"
            if (userType === "new") {
                // Validate required fields
                if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
                    toast.error("Please fill all required fields (Email, Password, First Name, Last Name)");
                    return;
                }

                newContactData = {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phoneNumber,
                    streetAddress: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    gender: formData.gender
                };
            }


            // Validate booking data
            if ((!contactId && !newContactData) || !selectedService) {
                toast.error("Please select a contact and service");
                return;
            }

            // Prepare sub-services and addons arrays
            const subServices = Object.entries(subServiceQuantities)
                .filter(([_, qty]) => qty > 0)
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));

            const addons = Object.entries(addonQuantities)
                .filter(([_, qty]) => qty > 0)
                .map(([serviceId, quantity]) => ({ serviceId, quantity }));

            // Create booking payload
            const bookingData = {
                newContact: newContactData, // Send new contact data if applicable
                contactId, // Will be null if new contact
                technicianId: initialData?.technicianId,
                technicianIds: selectedTechnicianIds,
                serviceId: selectedService._id,
                subServices,
                addons,
                bookingType,
                frequency: bookingType === "recurring" ? frequency : undefined,
                customRecurrence: bookingType === "recurring" ? {
                    selectedDays,
                    endDate: recurringEndDate
                } : undefined,
                startDateTime: bookingStart,
                endDateTime: bookingEnd,
                shippingAddress: {
                    street: formData.shippingAddress,
                    city: formData.shippingCity,
                    state: formData.shippingState,
                    zipCode: formData.shippingZipCode
                },
                notes: formData.notes,
                pricing: {
                    baseAmount: selectedService.basePrice || selectedService.hourlyRate || 0,
                    subServicesAmount: subTotal,
                    addonsAmount: addonsTotal,
                    totalAmount: total,
                    discount,
                    finalAmount,
                    billedHours: 0
                }
            };

            const bookingRes = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            if (!bookingRes.ok) {
                const errorData = await bookingRes.json();
                throw new Error(errorData.error || "Failed to create booking");
            }

            toast.success(bookingType === "once"
                ? "Booking created successfully!"
                : "Recurring bookings created successfully!");

            onOpenChange(false);
            // Refresh calendar
            window.location.reload();
        } catch (error: any) {
            console.error("Booking creation error:", error);
            toast.error(error.message || "Failed to create booking. Please try again.");
        }
    };

    const startDate = initialData?.start ? format(initialData.start, "dd-MM-yyyy HH:mm") : "";
    const endDate = initialData?.end ? format(initialData.end, "dd-MM-yyyy HH:mm") : "";

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
                                        <SelectContent className="z-[150]">
                                            {contacts.map(contact => (
                                                <SelectItem key={contact._id} value={contact._id}>
                                                    {contact.firstName} {contact.lastName} - {contact.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Preferred Email</Label>
                                    <Input
                                        placeholder="Enter email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                                {userType === "new" && (
                                    <div className="space-y-1">
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="Enter password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label>First Name</Label>
                                    <Input
                                        placeholder="First Name"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Last Name</Label>
                                    <Input
                                        placeholder="Last Name"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Phone Number</Label>
                                    <Input
                                        placeholder="Phone Number"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Street Address</Label>
                                <Input
                                    placeholder="Street Address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    disabled={userType === "existing"}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label>City</Label>
                                    <Input
                                        placeholder="City"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        disabled={userType === "existing"}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>State</Label>
                                    <Select
                                        value={formData.state}
                                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                                        disabled={userType === "existing"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[150]">
                                            <SelectItem value="California">California</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Zip Code</Label>
                                    <Input
                                        placeholder="Zip"
                                        value={formData.zipCode}
                                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
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
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Default Shipping Address" />
                                            </SelectTrigger>
                                            <SelectContent className="z-[150]">
                                                <SelectItem value="same">Same As Above</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Street Address</Label>
                                        <Input
                                            placeholder="Street Address"
                                            value={formData.shippingAddress}
                                            onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <Label>City</Label>
                                            <Input
                                                placeholder="City"
                                                value={formData.shippingCity}
                                                onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>State</Label>
                                            <Select
                                                value={formData.shippingState}
                                                onValueChange={(value) => setFormData({ ...formData, shippingState: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="z-[150]">
                                                    <SelectItem value="California">California</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Zip Code</Label>
                                            <Input
                                                placeholder="Zip"
                                                value={formData.shippingZipCode}
                                                onChange={(e) => setFormData({ ...formData, shippingZipCode: e.target.value })}
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
                                                <SelectItem value="custom">Custom Recurrence</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

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

                                    <div className="space-y-1">
                                        <Label>Recurring End Date</Label>
                                        <Input
                                            type="date"
                                            value={recurringEndDate}
                                            onChange={(e) => setRecurringEndDate(e.target.value)}
                                        />
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
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Estimated Price Section */}
                    <div className="p-4 border rounded-md bg-card space-y-6 shadow-sm">
                        <h3 className="font-semibold text-md">Estimated Price</h3>

                        <div className="space-y-8">
                            {bookingType === "once" && (
                                <div className="grid grid-cols-2 gap-6 pb-6 border-b border-dashed mb-4">
                                    <div className="space-y-2">
                                        <Label>Start Date/Time</Label>
                                        <DateTimePicker
                                            date={bookingStart}
                                            setDate={(d) => setBookingStart(d)}
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
                                    <Label>Total Discount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={discount}
                                            onChange={(e) => setDiscount(Number(e.target.value))}
                                            className="pl-7"
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
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="default" onClick={handleSubmit}>Create Booking</Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
