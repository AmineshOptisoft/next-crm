"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Pencil, Trash2, Check, X, Eye, MapPin, User, Filter, Camera, Loader2, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceDefaults } from "./ServiceDefaults";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/date-range-picker";

// Service Type Definition
interface ServiceData {
    id: string;
    technicianName: string;
    startDate: string;
    service: string;
    status: string;
}

// Define columns for DataTable
const createServiceColumns = (
    onView: (service: ServiceData) => void,
    onApprove: (id: string) => void,
    onReject: (id: string) => void
): ColumnDef<ServiceData>[] => [
        {
            accessorKey: "technicianName",
            header: "TECHNICIAN NAME",
            cell: ({ row }) => <div className="font-medium">{row.getValue("preferredTechnician")}</div>,
        },
        {
            accessorKey: "startDate",
            header: "START DATE",
            cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
        },
        {
            accessorKey: "service",
            header: "SERVICE",
            cell: ({ row }) => <div>{row.getValue("service")}</div>,
        },
        {
            accessorKey: "status",
            header: "STATUS",
            cell: ({ row }) => (
                <Badge className="bg-blue-100 text-blue-800">{row.getValue("status")}</Badge>
            ),
        },
        {
            id: "actions",
            header: "ACTION",
            cell: ({ row }) => {
                const service = row.original;
                return (
                    <div className="flex gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => onView(service)}
                        >
                            <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-green-600 hover:text-green-700"
                            onClick={() => onApprove(service.id)}
                        >
                            <Check className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => onReject(service.id)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                );
            },
        },
    ];

// Accordion Item Component for cleaner code
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

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [services, setServices] = useState<ServiceData[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterDates, setFilterDates] = useState({
        appointmentFrom: "",
        appointmentTo: "",
    });

    // Accordion states
    const [sections, setSections] = useState({
        about: true,
        billing: false,
        booking: false,
        service: false,
        shipping: false
    });
    const [uploading, setUploading] = useState(false);
    const [sameAsBilling, setSameAsBilling] = useState(false);
    const [statesList, setStatesList] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        async function fetchStates() {
            try {
                // Defaulting to US states for dynamic list
                const res = await fetch("/api/geo/states?countryId=US");
                if (res.ok) {
                    const data = await res.json();
                    setStatesList(data);
                }
            } catch (err) {
                console.error("Failed to fetch states", err);
            }
        }
        fetchStates();
    }, []);

    const handleSameAsBillingToggle = (checked: boolean) => {
        setSameAsBilling(checked);
        if (checked) {
            setData({
                ...data,
                shippingAddress: { ...data.billingAddress }
            });
        }
    };

    const updateBillingField = (field: string, value: any) => {
        const newBillingAddress = { ...data.billingAddress, [field]: value };
        const updates: any = { billingAddress: newBillingAddress };
        if (sameAsBilling) {
            updates.shippingAddress = { ...data.shippingAddress, [field]: value };
        }
        setData({ ...data, ...updates });
    };

    const toggleSection = (key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        if (id) fetchContact();
    }, [id]);

    async function fetchContact() {
        try {
            const res = await fetch(`/api/contacts/${id}`);
            if (res.ok) {
                const contact = await res.json();
                // Ensure nested objects exist
                contact.billingAddress = contact.billingAddress || {};
                contact.shippingAddress = contact.shippingAddress || {};
                contact.shippingAddresses = contact.shippingAddresses || [];
                setData(contact);

                // Initialize sameAsBilling if they match
                if (contact.billingAddress && contact.shippingAddress) {
                    const b = contact.billingAddress;
                    const s = contact.shippingAddress;
                    if (b.street === s.street && b.city === s.city && b.state === s.state && b.zipCode === s.zipCode && b.street) {
                        setSameAsBilling(true);
                    }
                }
                setServices([]); // Reverting to empty array to prevent error/blank list if not an array


            } else {
                toast.error("Contact not found");
                router.push("/dashboard/contacts");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error loading contact");
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate() {
        try {
            const res = await fetch(`/api/contacts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                toast.success("Updated successfully");
            } else {
                toast.error("Update failed");
            }
        } catch (e) {
            toast.error("Update failed");
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure?")) return;
        try {
            await fetch(`/api/contacts/${id}`, { method: "DELETE" });
            toast.success("Deleted successfully");
            router.push("/dashboard/contacts");
        } catch (e) {
            toast.error("Delete failed");
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload?subfolder=contacts", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const dataRes = await res.json();
            setData({ ...data, avatarUrl: dataRes.url });
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    }

    // Service handlers
    const handleViewService = (service: ServiceData) => {
        toast.info(`Viewing service: ${service.service}`);
    };

    const handleApproveService = (serviceId: string) => {
        setServices(services.map(s => s.id === serviceId ? { ...s, status: "Approved" } : s));
        toast.success("Service approved");
    };

    const handleRejectService = (serviceId: string) => {
        setServices(services.map(s => s.id === serviceId ? { ...s, status: "Rejected" } : s));
        toast.error("Service rejected");
    };

    // --- Filter Modal State & Helpers ---
    const [selectedPreset, setSelectedPreset] = useState<string>("");
    const [filterTechnician, setFilterTechnician] = useState("");
    function handlePreset(preset: string) {
        setSelectedPreset(preset);
        const today = new Date();
        let from = "", to = "";
        switch (preset) {
            case "today":
                from = to = today.toISOString().slice(0, 10);
                break;
            case "yesterday":
                from = to = subDays(today, 1).toISOString().slice(0, 10);
                break;
            case "thisWeek":
                from = startOfWeek(today, { weekStartsOn: 1 }).toISOString().slice(0, 10);
                to = endOfWeek(today, { weekStartsOn: 1 }).toISOString().slice(0, 10);
                break;
            case "lastWeek": {
                const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
                const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
                from = lastWeekStart.toISOString().slice(0, 10);
                to = lastWeekEnd.toISOString().slice(0, 10);
                break;
            }
            case "thisMonth":
                from = startOfMonth(today).toISOString().slice(0, 10);
                to = endOfMonth(today).toISOString().slice(0, 10);
                break;
            case "lastMonth": {
                const lastMonth = subDays(startOfMonth(today), 1);
                from = startOfMonth(lastMonth).toISOString().slice(0, 10);
                to = endOfMonth(lastMonth).toISOString().slice(0, 10);
                break;
            }
            default:
                break;
        }
        setFilterDates({ appointmentFrom: from, appointmentTo: to });
    }
    function formatDateInput(dateStr: string) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!data) return <div className="p-8 text-center">Contact not found</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-4">
                    {data.image ? (
                        <img src={data.image} alt={data.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                            <User className="w-8 h-8" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{data.name}</h1>
                        <p className="text-muted-foreground">{data.address?.city && `${data.address.city}, `}{data.status}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/dashboard/contacts')}>
                        Back to List
                    </Button>
                </div>
            </div> */}
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account profile and preferences
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Services Table */}
                {!isExpanded && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsFilterOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Filter className="h-4 w-4" /> Filter
                            </Button>
                        </div>

                        <DataTable
                            columns={createServiceColumns(
                                handleViewService,
                                handleApproveService,
                                handleRejectService
                            )}
                            data={services}
                            searchPlaceholder="Search services..."
                        />
                    </div>
                )}

                {/* Right Column: Customer Details */}
                <div className={`space-y-4 ${isExpanded ? "lg:col-span-2" : ""}`}>
                    <div className="flex justify-between items-center">
                        <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? (
                                <><Minimize2 className="mr-2 h-4 w-4" /> Restore</>
                            ) : (
                                <><Maximize2 className="mr-2 h-4 w-4" /> Resize</>
                            )}
                        </Button>
                        <span className="text-xs text-muted-foreground">Stax Id: {data.staxId || "N/A"}</span>
                    </div>

                    <div className="space-y-2">
                        {/* About This Customer */}
                        <AccordionItem title="About This Customer" isOpen={sections.about} onToggle={() => toggleSection('about')}>
                            <div className="space-y-4">
                                {/* Header with Name and Email */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="relative group">
                                        {data.avatarUrl ? (
                                            <img src={data.avatarUrl} alt="" className="w-16 h-16 rounded object-cover" />
                                        ) : (
                                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                                                <User className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        <label
                                            htmlFor="contact-avatar-upload"
                                            className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            {uploading ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Camera className="h-3 w-3" />
                                            )}
                                            <input
                                                id="contact-avatar-upload"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">{data.firstName} {data.lastName}</h3>
                                        <p className="text-primary flex items-center gap-1">{data.email} <CopyIcon className="h-3 w-3 cursor-pointer hover:text-primary" /></p>
                                        <p className="text-muted-foreground flex items-center gap-1">{data.phoneNumber} <CopyIcon className="h-3 w-3 cursor-pointer hover:text-primary" /></p>
                                        <a href="#" className="text-primary text-xs underline">Check keap Details</a>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>First Name</Label><Input value={data.firstName || ""} onChange={(e) => setData({ ...data, firstName: e.target.value })} /></div>
                                    <div className="space-y-1"><Label>Last Name</Label><Input value={data.lastName || ""} onChange={(e) => setData({ ...data, lastName: e.target.value })} /></div>
                                </div>
                                <div className="space-y-1 flex gap-2 justify-between items-center">
                                    <div className="flex-1">
                                        <Label>Email Address</Label>
                                        <Input value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="mt-6"><Pencil className="h-4 w-4" /></Button>
                                </div>
                                {/* <div className="space-y-1 flex gap-2">
                                    <div className="flex-1">
                                        <Label>Stax Id</Label>
                                        <Input value={data.staxId || ""} onChange={(e) => setData({ ...data, staxId: e.target.value })} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="mt-6"><Pencil className="h-4 w-4" /></Button>
                                </div> */}
                                <div className="space-y-1"><Label>Phone Number</Label><Input value={data.phoneNumber || ""} onChange={(e) => setData({ ...data, phoneNumber: e.target.value })} /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* <div className="space-y-1"><Label>Password</Label><Input type="password" placeholder=".................." disabled /></div> */}
                                    <div className="space-y-1 "><Label>Customer Stage</Label><Input className="w-full" value={data.contactStatus} onChange={(e) => setData({ ...data, contactStatus: e.target.value })} /></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between">
                                        <Label>SMS Status</Label>
                                        <Switch checked={data.smsStatus} onCheckedChange={(c) => setData({ ...data, smsStatus: c })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Email Status</Label>
                                        <Switch checked={data.emailStatus} onCheckedChange={(c) => setData({ ...data, emailStatus: c })} />
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        {/* Billing Details */}
                        <AccordionItem title="Billing Details" isOpen={sections.billing} onToggle={() => toggleSection('billing')}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Billing Address</Label>
                                        <Input value={data.billingAddress?.street || ""} onChange={(e) => updateBillingField("street", e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Billing Zip Code</Label>
                                        <Input value={data.billingAddress?.zipCode || ""} onChange={(e) => updateBillingField("zipCode", e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Billing City</Label>
                                        <Input value={data.billingAddress?.city || ""} onChange={(e) => updateBillingField("city", e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Billing State</Label>
                                        <Select value={data.billingAddress?.state} onValueChange={(v) => updateBillingField("state", v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {statesList.map(s => (
                                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                ))}
                                                {statesList.length === 0 && (
                                                    <>
                                                        <SelectItem value="California">California</SelectItem>
                                                        <SelectItem value="Alabama">Alabama</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="same-as-billing" checked={sameAsBilling} onCheckedChange={handleSameAsBillingToggle} />
                                    <Label htmlFor="same-as-billing" className="text-sm font-medium leading-none cursor-pointer">
                                        Shipping address same as billing
                                    </Label>
                                </div>

                                <Separator className="my-2" />

                                <div className="space-y-1">
                                    <Label>Select Default Shipping Address</Label>
                                    <Select>
                                        <SelectTrigger><SelectValue placeholder="Select Default Shipping Address" /></SelectTrigger>
                                        <SelectContent><SelectItem value="default">Default</SelectItem></SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Default Shipping Address</Label>
                                        <Input
                                            value={data.shippingAddress?.street || ""}
                                            onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, street: e.target.value } })}
                                            disabled={sameAsBilling}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Shipping Zip Code</Label>
                                        <Input
                                            value={data.shippingAddress?.zipCode || ""}
                                            onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, zipCode: e.target.value } })}
                                            disabled={sameAsBilling}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Shipping City</Label>
                                        <Input
                                            value={data.shippingAddress?.city || ""}
                                            onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, city: e.target.value } })}
                                            disabled={sameAsBilling}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Shipping State</Label>
                                        <Select
                                            value={data.shippingAddress?.state}
                                            onValueChange={(v) => setData({ ...data, shippingAddress: { ...data.shippingAddress, state: v } })}
                                            disabled={sameAsBilling}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {statesList.map(s => (
                                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                ))}
                                                {statesList.length === 0 && (
                                                    <>
                                                        <SelectItem value="California">California</SelectItem>
                                                        <SelectItem value="Alabama">Alabama</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        {/* Booking Data */}
                        <AccordionItem title="Booking Data" isOpen={sections.booking} onToggle={() => toggleSection('booking')}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Default Payment Method</Label>
                                        <Select value={data.defaultPaymentMethod} onValueChange={v => setData({ ...data, defaultPaymentMethod: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Fattmerchant">Fattmerchant</SelectItem>
                                                <SelectItem value="Stripe">Stripe</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1"><Label>Billed Amount</Label><Input value={data.billedAmount || ""} onChange={(e) => setData({ ...data, billedAmount: e.target.value })} /></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>Bathrooms</Label><Input value={data.bathrooms || ""} onChange={(e) => setData({ ...data, bathrooms: e.target.value })} /></div>
                                    <div className="space-y-1"><Label>Bedrooms</Label><Input value={data.bedrooms || ""} onChange={(e) => setData({ ...data, bedrooms: e.target.value })} /></div>
                                </div>

                                <div className="space-y-1"><Label>Billed Hours(HH:mm)</Label><Input value={data.billedHours || ""} onChange={(e) => setData({ ...data, billedHours: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Key Number</Label><Input value={data.keyNumber || ""} onChange={(e) => setData({ ...data, keyNumber: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Preferences</Label><Input value={data.preferences || ""} onChange={(e) => setData({ ...data, preferences: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Family Info</Label><Input value={data.familyInfo || ""} onChange={(e) => setData({ ...data, familyInfo: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Parking Access</Label><Input value={data.parkingAccess || ""} onChange={(e) => setData({ ...data, parkingAccess: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Preferred Technician</Label><Input value={data.preferredTechnician || ""} onChange={(e) => setData({ ...data, preferredTechnician: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Client notes from tech</Label><Input value={data.clientNotesFromTech || ""} onChange={(e) => setData({ ...data, clientNotesFromTech: e.target.value })} /></div>

                                <div className="space-y-1"><Label>Special instructions from the client</Label><Input value={data.specialInstructionsClient || ""} onChange={(e) => setData({ ...data, specialInstructionsClient: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Special instructions from the admin</Label><Input value={data.specialInstructionsAdmin || ""} onChange={(e) => setData({ ...data, specialInstructionsAdmin: e.target.value })} /></div>

                                <div className="space-y-1"><Label>Notes</Label><Input value={data.notes || ""} onChange={(e) => setData({ ...data, notes: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Billing Notes</Label><Input value={data.billingNotes || ""} onChange={(e) => setData({ ...data, billingNotes: e.target.value })} /></div>

                                <div className="space-y-1"><Label>Discount</Label><Input value={data.discount || ""} onChange={(e) => setData({ ...data, discount: e.target.value })} /></div>
                                <div className="space-y-1">
                                    <Label>Tags</Label>
                                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                                        {data.tags && data.tags.map((tag: string, index: number) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {tag} <X className="h-3 w-3 cursor-pointer" onClick={() => {
                                                    const newTags = [...data.tags];
                                                    newTags.splice(index, 1);
                                                    setData({ ...data, tags: newTags });
                                                }} />
                                            </Badge>
                                        ))}
                                        <Input
                                            className="border-none shadow-none focus-visible:ring-0 h-6 p-0 w-32 min-w-[50px]"
                                            placeholder="Add tag..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = e.currentTarget.value.trim();
                                                    if (val && (!data.tags || !data.tags.includes(val))) {
                                                        setData({ ...data, tags: [...(data.tags || []), val] });
                                                        e.currentTarget.value = "";
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1"><Label>FSR Assigned</Label><Input value={data.fsrAssigned || ""} onChange={(e) => setData({ ...data, fsrAssigned: e.target.value })} readOnly className="bg-muted" /></div>
                            </div>
                        </AccordionItem>

                        {/* Service Defaults */}
                        <AccordionItem title="Service defaults" isOpen={sections.service} onToggle={() => toggleSection('service')}>
                            <ServiceDefaults editorData={data.serviceDefaults || {}} onChange={(newData: any) => setData({ ...data, serviceDefaults: newData })} />
                        </AccordionItem>

                        {/* Shipping Address List */}
                        <AccordionItem title="Shipping Address List" isOpen={sections.shipping} onToggle={() => toggleSection('shipping')}>
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button className="bg-[#66b911] hover:bg-[#5da710] text-white">Add</Button>
                                        </SheetTrigger>
                                        <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
                                            <SheetHeader className="p-4 border-b">
                                                <SheetTitle>Shipping address</SheetTitle>
                                            </SheetHeader>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                const formData = new FormData(e.currentTarget);
                                                const newAddress = {
                                                    title: formData.get('title'),
                                                    street: formData.get('street'),
                                                    zipCode: formData.get('zipCode'),
                                                    city: formData.get('city'),
                                                    state: formData.get('state'),
                                                };
                                                const currentAddresses = data.shippingAddresses || [];
                                                setData({ ...data, shippingAddresses: [...currentAddresses, newAddress] });
                                                toast.success("Address added locally. Click Update to save.");
                                            }} className="flex-1 flex flex-col overflow-hidden">
                                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="title">Address Title</Label>
                                                        <Input id="title" name="title" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="street">Shipping Address</Label>
                                                        <Input id="street" name="street" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="zipCode">Shipping Zip Code</Label>
                                                        <Input id="zipCode" name="zipCode" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="city">Shipping City</Label>
                                                        <Input id="city" name="city" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="state">Shipping State</Label>
                                                        <Input id="state" name="state" />
                                                    </div>
                                                </div>
                                                <SheetFooter className="p-4 border-t gap-2">
                                                    <SheetClose asChild>
                                                        <Button type="submit">Save Changes</Button>
                                                    </SheetClose>
                                                    <SheetClose asChild>
                                                        <Button type="button" variant="outline">Cancel</Button>
                                                    </SheetClose>
                                                </SheetFooter>
                                            </form>
                                        </SheetContent>
                                    </Sheet>
                                </div>

                                <div className="space-y-2">
                                    {data.shippingAddresses && data.shippingAddresses.map((addr: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
                                            <span className="text-gray-700 text-sm">
                                                - {addr.street || "No Street"}, {addr.city || "No City"}, {addr.zipCode || "No Zip"}, {addr.state || "No State"}
                                            </span>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-500" onClick={() => {
                                                const newAddrs = [...data.shippingAddresses];
                                                newAddrs.splice(index, 1);
                                                setData({ ...data, shippingAddresses: newAddrs });
                                            }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!data.shippingAddresses || data.shippingAddresses.length === 0) && (
                                        <div className="text-center text-gray-400 text-sm py-2">No shipping addresses added</div>
                                    )}
                                </div>
                            </div>
                        </AccordionItem>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" size="icon"><Maximize2 className="h-4 w-4" /></Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        <Button variant="secondary">Send Password</Button>
                        <Button variant="default" onClick={handleUpdate}>Update</Button>
                        <Button variant="outline" onClick={() => router.push('/dashboard/contacts')}>Cancel</Button>
                    </div>
                </div>
            </div>

            {/* Redesigned Filter Dialog */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen} >
                <DialogContent className=" p-0 rounded-2xl overflow-hidden bg-background border border-border">
                    <div className="flex flex-col w-full">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-muted border-b border-border">
                            <span className="text-xl font-bold text-foreground">Filter data</span>
                            {/* <button onClick={() => setIsFilterOpen(false)} className="text-2xl text-muted-foreground hover:text-foreground">&times;</button> */}
                        </div>
                        {/* Body */}
                        <div className="flex w-full min-h-[350px]">


                            <div className="bg-background rounded-lg shadow-sm border border-border">
                                <DateRangePicker
                                    startDate={filterDates.appointmentFrom}
                                    endDate={filterDates.appointmentTo}
                                    onRangeChange={(start, end) => setFilterDates({ appointmentFrom: start, appointmentTo: end })}
                                    placeholder="Select date range"
                                    showMonthAndYearPickers={true}
                                    className="!bg-background"
                                />
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="flex justify-end px-6 py-4 bg-muted border-t border-border">
                            <Button
                                className=" font-bold px-8 py-2 rounded shadow"
                                onClick={() => { setIsFilterOpen(false); toast.success('Filters applied'); }}
                            >
                                Submit
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

// CopyIcon removed as it's now imported or handled inline

