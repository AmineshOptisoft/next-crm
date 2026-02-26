"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, X, User, Camera, Loader2, Copy as CopyIcon, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { ServiceDefaults } from "./ServiceDefaults";
import { Country, State, City } from "country-state-city";

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [sameAsBilling, setSameAsBilling] = useState(false);

    // Cascading Location Logic - Billing Address
    const countries = Country.getAllCountries();
    const billingSelectedCountry = countries.find((c) => c.name === data?.billingAddress?.country);
    const billingCountryCode = billingSelectedCountry?.isoCode;
    const billingStates = billingCountryCode ? State.getStatesOfCountry(billingCountryCode) : [];
    const billingSelectedState = billingStates.find((s) => s.name === data?.billingAddress?.state);
    const billingStateCode = billingSelectedState?.isoCode;
    const billingCities = (billingCountryCode && billingStateCode) ? City.getCitiesOfState(billingCountryCode, billingStateCode) : [];

    // Cascading Location Logic - Shipping Address
    const shippingSelectedCountry = countries.find((c) => c.name === data?.shippingAddress?.country);
    const shippingCountryCode = shippingSelectedCountry?.isoCode;
    const shippingStates = shippingCountryCode ? State.getStatesOfCountry(shippingCountryCode) : [];
    const shippingSelectedState = shippingStates.find((s) => s.name === data?.shippingAddress?.state);
    const shippingStateCode = shippingSelectedState?.isoCode;
    const shippingCities = (shippingCountryCode && shippingStateCode) ? City.getCitiesOfState(shippingCountryCode, shippingStateCode) : [];

    const handleSameAsBillingToggle = (checked: boolean) => {
        setSameAsBilling(checked);
        if (checked) {
            setData({ ...data, shippingAddress: { ...data.billingAddress } });
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

    useEffect(() => {
        if (id) fetchContact();
    }, [id]);

    async function fetchContact() {
        try {
            const res = await fetch(`/api/contacts/${id}`);
            if (res.ok) {
                const contact = await res.json();
                contact.billingAddress = contact.billingAddress || {};
                contact.shippingAddress = contact.shippingAddress || {};
                contact.shippingAddresses = contact.shippingAddresses || [];
                setData(contact);

                if (contact.billingAddress && contact.shippingAddress) {
                    const b = contact.billingAddress;
                    const s = contact.shippingAddress;
                    if (b.street === s.street && b.city === s.city && b.state === s.state && b.zipCode === s.zipCode && b.street) {
                        setSameAsBilling(true);
                    }
                }
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
            const updatePayload = {
                ...data,
                phone: data.phoneNumber,
                status: data.contactStatus,
                image: data.avatarUrl,
                company: data.companyName,
            };
            const res = await fetch(`/api/contacts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload),
            });
            if (res.ok) {
                toast.success("Updated successfully");
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || "Update failed");
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
            const res = await fetch("/api/upload?subfolder=contacts", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload failed");
            const dataRes = await res.json();
            setData({ ...data, avatarUrl: dataRes.url });
            toast.success("Image uploaded successfully");
        } catch (error) {
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!data) return <div className="p-8 text-center">Contact not found</div>;

    return (
        <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Contacts Settings</h1>
                <p className="text-muted-foreground">Manage your account profile and preferences</p>
            </div>

            {/* Two-Panel Layout */}
            <div className="flex gap-0 flex-1 border rounded-lg overflow-hidden bg-card shadow-sm">

                {/* ── LEFT PANEL: About This Customer (always open) ── */}
                <div className="w-[500px] shrink-0 border-r flex flex-col bg-card">
                    {/* Contact Identity Header */}
                    <div className="p-5 border-b bg-muted/30">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative group shrink-0">
                                {data.avatarUrl ? (
                                    <img src={data.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                                ) : (
                                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                                        <User className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                )}
                                <label
                                    htmlFor="contact-avatar-upload"
                                    className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                                    <input id="contact-avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                </label>
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-semibold text-foreground truncate">{data.firstName} {data.lastName}</h2>
                                <p className="text-xs text-muted-foreground truncate">{data.contactStatus || "Customer"}</p>
                            </div>
                        </div>
                        <div className="flex gap-1 text-xs text-muted-foreground">
                            {data.email && (
                                <button
                                    onClick={() => { navigator.clipboard.writeText(data.email); toast.success("Email copied"); }}
                                    className="flex items-center gap-1 hover:text-primary transition-colors truncate"
                                    title={data.email}
                                >
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{data.email}</span>
                                </button>
                            )}
                        </div>
                        {data.phoneNumber && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{data.phoneNumber}</span>
                            </div>
                        )}
                        {data.companyName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{data.companyName}</span>
                            </div>
                        )}
                    </div>

                    {/* About Form Fields */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About this customer</p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">First Name</Label>
                                <Input className="h-8 text-sm" value={data.firstName || ""} onChange={(e) => setData({ ...data, firstName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Last Name</Label>
                                <Input className="h-8 text-sm" value={data.lastName || ""} onChange={(e) => setData({ ...data, lastName: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Email Address</Label>
                            <div className="flex gap-1">
                                <Input className="h-8 text-sm flex-1" value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { navigator.clipboard.writeText(data.email); toast.success("Copied"); }}>
                                    <CopyIcon className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Phone Number</Label>
                            <div className="flex gap-1">
                                <Input className="h-8 text-sm flex-1" value={data.phoneNumber || ""} onChange={(e) => setData({ ...data, phoneNumber: e.target.value })} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { navigator.clipboard.writeText(data.phoneNumber); toast.success("Copied"); }}>
                                    <CopyIcon className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Customer Stage</Label>
                            <Input className="h-8 text-sm" value={data.contactStatus || ""} onChange={(e) => setData({ ...data, contactStatus: e.target.value })} />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <Label className="text-xs">SMS Status</Label>
                            <Switch checked={!!data.smsStatus} onCheckedChange={(c) => setData({ ...data, smsStatus: c })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Email Status</Label>
                            <Switch checked={!!data.emailStatus} onCheckedChange={(c) => setData({ ...data, emailStatus: c })} />
                        </div>

                        {data.staxId && (
                            <div className="text-xs text-muted-foreground pt-1">
                                Stax ID: <span className="font-mono">{data.staxId}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 border-t flex gap-2">
                        <Button className="flex-1" onClick={handleUpdate}>Update</Button>
                        <Button variant="destructive" size="icon" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
                        <Button variant="outline" onClick={() => router.push('/dashboard/contacts')}>Cancel</Button>
                    </div>
                </div>

                {/* ── RIGHT PANEL: Tabs ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-background">
                    <Tabs defaultValue="billing" className="flex flex-col h-full">
                        <div className="border-b bg-card px-4">
                            <TabsList className="h-12 bg-transparent gap-0 rounded-none p-0">
                                {[
                                    { value: "billing", label: "Billing Details" },
                                    { value: "booking", label: "Booking Data" },
                                    { value: "service", label: "Service Defaults" },
                                    { value: "shipping", label: "Shipping Addresses" },
                                ].map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 h-12 text-sm font-medium"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {/* ── Billing Details Tab ── */}
                        <TabsContent value="billing" className="flex-1 overflow-y-auto p-6 mt-0">
                            <div className="space-y-5">
                                <h3 className="font-semibold text-foreground">Billing Address</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>Street Address</Label>
                                        <Input value={data.billingAddress?.street || ""} onChange={(e) => updateBillingField("street", e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Zip Code</Label>
                                        <Input value={data.billingAddress?.zipCode || ""} onChange={(e) => updateBillingField("zipCode", e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Country</Label>
                                        <Select value={data.billingAddress?.country} onValueChange={(v) => setData({ ...data, billingAddress: { ...data.billingAddress, country: v, state: "", city: "" } })}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Country" /></SelectTrigger>
                                            <SelectContent>
                                                {countries.map((country) => (
                                                    <SelectItem key={country.isoCode} value={country.name}>{country.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>State</Label>
                                        <Select value={data.billingAddress?.state} onValueChange={(v) => setData({ ...data, billingAddress: { ...data.billingAddress, state: v, city: "" } })} disabled={!billingCountryCode}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                                            <SelectContent>
                                                {billingStates.map((state) => (
                                                    <SelectItem key={state.isoCode} value={state.name}>{state.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>City</Label>
                                        <Select value={data.billingAddress?.city} onValueChange={(v) => updateBillingField("city", v)} disabled={!billingStateCode}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select City" /></SelectTrigger>
                                            <SelectContent>
                                                {billingCities.map((city) => (
                                                    <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="same-as-billing" checked={sameAsBilling} onCheckedChange={handleSameAsBillingToggle} />
                                    <Label htmlFor="same-as-billing" className="text-sm cursor-pointer">Shipping address same as billing</Label>
                                </div>

                                <Separator />

                                <h3 className="font-semibold text-foreground">Shipping Address</h3>
                                <div className="space-y-1 max-w-xs">
                                    <Label>Select Default Shipping Address</Label>
                                    <Select>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Default Shipping Address" /></SelectTrigger>
                                        <SelectContent><SelectItem value="default">Default</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>Street Address</Label>
                                        <Input value={data.shippingAddress?.street || ""} onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, street: e.target.value } })} disabled={sameAsBilling} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Zip Code</Label>
                                        <Input value={data.shippingAddress?.zipCode || ""} onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, zipCode: e.target.value } })} disabled={sameAsBilling} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>Country</Label>
                                        <Select value={data.shippingAddress?.country} onValueChange={(v) => setData({ ...data, shippingAddress: { ...data.shippingAddress, country: v, state: "", city: "" } })} disabled={sameAsBilling}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Country" /></SelectTrigger>
                                            <SelectContent>
                                                {countries.map((country) => (
                                                    <SelectItem key={country.isoCode} value={country.name}>{country.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>State</Label>
                                        <Select value={data.shippingAddress?.state} onValueChange={(v) => setData({ ...data, shippingAddress: { ...data.shippingAddress, state: v, city: "" } })} disabled={sameAsBilling || !shippingCountryCode}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                                            <SelectContent>
                                                {shippingStates.map((state) => (
                                                    <SelectItem key={state.isoCode} value={state.name}>{state.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>City</Label>
                                        <Select value={data.shippingAddress?.city} onValueChange={(v) => setData({ ...data, shippingAddress: { ...data.shippingAddress, city: v } })} disabled={sameAsBilling || !shippingStateCode}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select City" /></SelectTrigger>
                                            <SelectContent>
                                                {shippingCities.map((city) => (
                                                    <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── Booking Data Tab ── */}
                        <TabsContent value="booking" className="flex-1 overflow-y-auto p-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Booking Information</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>Default Payment Method</Label>
                                        <Select value={data.defaultPaymentMethod} onValueChange={v => setData({ ...data, defaultPaymentMethod: v })}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Fattmerchant">Fattmerchant</SelectItem>
                                                <SelectItem value="Stripe">Stripe</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Billed Amount</Label>
                                        <Input value={data.billedAmount || ""} onChange={(e) => setData({ ...data, billedAmount: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label>Bathrooms</Label>
                                        <Input value={data.bathrooms || ""} onChange={(e) => setData({ ...data, bathrooms: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Bedrooms</Label>
                                        <Input value={data.bedrooms || ""} onChange={(e) => setData({ ...data, bedrooms: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label>Billed Hours (HH:mm)</Label>
                                        <Input value={data.billedHours || ""} onChange={(e) => setData({ ...data, billedHours: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Key Number</Label>
                                        <Input value={data.keyNumber || ""} onChange={(e) => setData({ ...data, keyNumber: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Preferences</Label>
                                    <Input value={data.preferences || ""} onChange={(e) => setData({ ...data, preferences: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Family Info</Label>
                                    <Input value={data.familyInfo || ""} onChange={(e) => setData({ ...data, familyInfo: e.target.value })} />
                                </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Parking Access</Label>
                                    <Input value={data.parkingAccess || ""} onChange={(e) => setData({ ...data, parkingAccess: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Preferred Technician</Label>
                                    <Input value={data.preferredTechnician || ""} onChange={(e) => setData({ ...data, preferredTechnician: e.target.value })} />
                                </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Client Notes from Tech</Label>
                                    <Input value={data.clientNotesFromTech || ""} onChange={(e) => setData({ ...data, clientNotesFromTech: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Special Instructions from Client</Label>
                                    <Input value={data.specialInstructionsClient || ""} onChange={(e) => setData({ ...data, specialInstructionsClient: e.target.value })} />
                                </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Special Instructions from Admin</Label>
                                    <Input value={data.specialInstructionsAdmin || ""} onChange={(e) => setData({ ...data, specialInstructionsAdmin: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Notes</Label>
                                    <Input value={data.notes || ""} onChange={(e) => setData({ ...data, notes: e.target.value })} />
                                </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label>Billing Notes</Label>
                                    <Input value={data.billingNotes || ""} onChange={(e) => setData({ ...data, billingNotes: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Discount</Label>
                                    <Input value={data.discount || ""} onChange={(e) => setData({ ...data, discount: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Tags</Label>
                                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                                        {data.tags && data.tags.map((tag: string, index: number) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {tag}
                                                <X className="h-3 w-3 cursor-pointer" onClick={() => {
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
                                 </div>
                                 <div className="space-y-1">
                                     <Label>FSR Assigned</Label>
                                     <Input value={data.fsrAssigned || ""} readOnly className="bg-muted" />
                                 </div>
                            </div>
                        </TabsContent>

                        {/* ── Service Defaults Tab ── */}
                        <TabsContent value="service" className="flex-1 overflow-y-auto p-6 mt-0">
                            <div className="w-full">
                                <h3 className="font-semibold text-foreground mb-4">Service Defaults</h3>
                                <ServiceDefaults
                                    editorData={data.serviceDefaults || {}}
                                    onChange={(newData: any) => setData({ ...data, serviceDefaults: newData })}
                                />
                            </div>
                        </TabsContent>

                        {/* ── Shipping Address List Tab ── */}
                        <TabsContent value="shipping" className="flex-1 overflow-y-auto p-6 mt-0">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-foreground">Shipping Address List</h3>
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button className="bg-black hover:bg-gray-800 text-white">Add Address</Button>
                                        </SheetTrigger>
                                        <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
                                            <SheetHeader className="p-4 border-b">
                                                <SheetTitle>Shipping Address</SheetTitle>
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
                                                toast.success("Address added. Click Update to save.");
                                            }} className="flex-1 flex flex-col overflow-hidden">
                                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="title">Address Title</Label>
                                                        <Input id="title" name="title" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="street">Shipping Address</Label>
                                                        <Input id="street" name="street" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="zipCode">Zip Code</Label>
                                                        <Input id="zipCode" name="zipCode" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="city">City</Label>
                                                        <Input id="city" name="city" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="state">State</Label>
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

                                <div className="border rounded-md divide-y">
                                    {data.shippingAddresses && data.shippingAddresses.map((addr: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3">
                                            <div>
                                                {addr.title && <p className="text-sm font-medium">{addr.title}</p>}
                                                <p className="text-sm text-muted-foreground">
                                                    {[addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ")}
                                                </p>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                                                const newAddrs = [...data.shippingAddresses];
                                                newAddrs.splice(index, 1);
                                                setData({ ...data, shippingAddresses: newAddrs });
                                            }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!data.shippingAddresses || data.shippingAddresses.length === 0) && (
                                        <div className="text-center text-muted-foreground text-sm py-8">No shipping addresses added yet</div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
