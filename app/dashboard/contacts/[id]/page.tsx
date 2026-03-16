"use client";

import { memo, useEffect, useMemo, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, X, User, Camera, Loader2, Copy as CopyIcon, Mail, Phone, Building2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ServiceDefaults } from "./ServiceDefaults";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// ─── Lazy-load country-state-city once — never blocks the JS bundle ───────────
let geoCache: any = null;
async function loadGeo() {
    if (geoCache) return geoCache;
    geoCache = await import("country-state-city");
    return geoCache;
}

// ─── VirtualGeoSelect (same UX as bookings/user form) ─────────────────────────
const ITEM_H = 36;
const LIST_H = 288;

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
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [typeAhead, setTypeAhead] = useState("");
    const [lastTypeTime, setLastTypeTime] = useState(0);

    const totalH = options.length * ITEM_H;
    const startIdx = Math.floor(scrollTop / ITEM_H);
    const visibleCount = Math.ceil(LIST_H / ITEM_H) + 2;
    const endIdx = Math.min(startIdx + visibleCount, options.length);
    const visibleItems = options.slice(startIdx, endIdx);
    const offsetY = startIdx * ITEM_H;

    const displayLabel = useMemo(
        () => options.find(o => o.value === value)?.label ?? "",
        [options, value]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
        if (!open) return;
        const key = e.key;
        if (key.length === 1 && /^[a-z0-9]$/i.test(key)) {
            const now = Date.now();
            const withinWindow = now - lastTypeTime < 700;
            const nextPrefix = (withinWindow ? typeAhead + key : key).toLowerCase();
            setTypeAhead(nextPrefix);
            setLastTypeTime(now);

            const idx = options.findIndex(o => o.label.toLowerCase().startsWith(nextPrefix));
            if (idx >= 0 && scrollRef.current) {
                const visibleHeight = Math.min(totalH, LIST_H);
                let newTop = idx * ITEM_H - visibleHeight / 2;
                newTop = Math.max(0, Math.min(newTop, Math.max(0, totalH - visibleHeight)));
                scrollRef.current.scrollTop = newTop;
                setScrollTop(newTop);
            }
        }
    };

    useEffect(() => {
        if (open) {
            setScrollTop(0);
            scrollRef.current?.scrollTo(0, 0);
        }
    }, [open]);

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

            {open && (
                <div className="absolute z-[200] mt-1 w-full rounded-md border bg-popover shadow-md">
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

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [sameAsBilling, setSameAsBilling] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [geoLib, setGeoLib] = useState<any>(null);

    // Email campaigns for this contact (Email tab)
    const [emailCampaigns, setEmailCampaigns] = useState<any[]>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [selectedCampaignLoading, setSelectedCampaignLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [updatingSection, setUpdatingSection] = useState<string | null>(null);

    // Load geo lib once in background
    useEffect(() => { loadGeo().then(setGeoLib); }, []);

    // ── Geo options (same as bookings/user form) ──────────────────────────────
    const countryOptions = useMemo(() => {
        if (!geoLib) return [];
        return geoLib.Country.getAllCountries().map((c: any) => ({ label: c.name, value: c.name, isoCode: c.isoCode }));
    }, [geoLib]);

    // Billing
    const billingCountryCode = useMemo(() => {
        return countryOptions.find((c: any) => c.value === (data?.billingAddress?.country || ""))?.isoCode ?? "";
    }, [countryOptions, data?.billingAddress?.country]);

    const billingStateOptions = useMemo(() => {
        if (!geoLib || !billingCountryCode) return [];
        return geoLib.State.getStatesOfCountry(billingCountryCode).map((s: any) => ({ label: s.name, value: s.name, isoCode: s.isoCode }));
    }, [geoLib, billingCountryCode]);

    const billingStateCode = useMemo(() => {
        return billingStateOptions.find((s: any) => s.value === (data?.billingAddress?.state || ""))?.isoCode ?? "";
    }, [billingStateOptions, data?.billingAddress?.state]);

    const billingCityOptions = useMemo(() => {
        if (!geoLib || !billingCountryCode || !billingStateCode) return [];
        return geoLib.City.getCitiesOfState(billingCountryCode, billingStateCode).map((c: any) => ({ label: c.name, value: c.name }));
    }, [geoLib, billingCountryCode, billingStateCode]);

    // Shipping
    const shippingCountryCode = useMemo(() => {
        return countryOptions.find((c: any) => c.value === (data?.shippingAddress?.country || ""))?.isoCode ?? "";
    }, [countryOptions, data?.shippingAddress?.country]);

    const shippingStateOptions = useMemo(() => {
        if (!geoLib || !shippingCountryCode) return [];
        return geoLib.State.getStatesOfCountry(shippingCountryCode).map((s: any) => ({ label: s.name, value: s.name, isoCode: s.isoCode }));
    }, [geoLib, shippingCountryCode]);

    const shippingStateCode = useMemo(() => {
        return shippingStateOptions.find((s: any) => s.value === (data?.shippingAddress?.state || ""))?.isoCode ?? "";
    }, [shippingStateOptions, data?.shippingAddress?.state]);

    const shippingCityOptions = useMemo(() => {
        if (!geoLib || !shippingCountryCode || !shippingStateCode) return [];
        return geoLib.City.getCitiesOfState(shippingCountryCode, shippingStateCode).map((c: any) => ({ label: c.name, value: c.name }));
    }, [geoLib, shippingCountryCode, shippingStateCode]);

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

    useEffect(() => {
        const fetchEmailCampaigns = async () => {
            try {
                setCampaignsLoading(true);
                const res = await fetch("/api/email-campaigns");
                const json = await res.json();
                if (json.success) {
                    setEmailCampaigns(json.data || []);
                }
            } catch (error) {
                console.error("Failed to load email campaigns:", error);
            } finally {
                setCampaignsLoading(false);
            }
        };

        fetchEmailCampaigns();
    }, []);

    async function handleSelectCampaign(campaign: any) {
        try {
            setSelectedCampaignLoading(true);
            const res = await fetch(`/api/email-campaigns/${campaign._id}`);
            const json = await res.json();
            if (json.success) {
                setSelectedCampaign(json.data);
            } else {
                toast.error(json.error || "Failed to load email campaign");
            }
        } catch (error) {
            console.error("Failed to load email campaign:", error);
            toast.error("Failed to load email campaign");
        } finally {
            setSelectedCampaignLoading(false);
        }
    }

    async function handleSendSelectedCampaign() {
        if (!selectedCampaign) {
            toast.error("Please select an email campaign first");
            return;
        }
        if (!data?.email) {
            toast.error("This contact does not have an email address");
            return;
        }

        try {
            setSendingEmail(true);
            const res = await fetch("/api/campaigns/bulk-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    campaignId: selectedCampaign._id,
                    emails: [data.email],
                }),
            });
            const json = await res.json();

            if (!res.ok || !json.success) {
                toast.error(json.error || "Failed to send email");
                return;
            }

            toast.success("Email sent to contact");
        } catch (error) {
            console.error("Failed to send email campaign:", error);
            toast.error("Failed to send email");
        } finally {
            setSendingEmail(false);
        }
    }

    async function handleUpdate(section: string) {
        try {
            setUpdatingSection(section);
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
        } finally {
            setUpdatingSection(null);
        }
    }

    async function handleDelete() {
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
                        <Button
                            className="flex-1"
                            onClick={() => handleUpdate("summary")}
                            disabled={updatingSection === "summary"}
                        >
                            {updatingSection === "summary" && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Update
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/dashboard/contacts')}>Cancel</Button>
                    </div>
                </div>

                {/* Delete Contact Confirmation */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete contact</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this contact? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    setDeleteDialogOpen(false);
                                    await handleDelete();
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── RIGHT PANEL: Tabs ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-background">
                    <Tabs defaultValue="billing" className="flex flex-col h-full">
                        <div className="border-b bg-card px-4">
                            <TabsList className="h-12 bg-transparent gap-0 rounded-none p-0">
                                {[
                                    { value: "billing", label: "Billing Details" },
                                    { value: "booking", label: "Personal Details" },
                                    { value: "service", label: "Service Defaults" },
                                    { value: "shipping", label: "Shipping Addresses" },
                                    { value: "email", label: "Email" },
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
                            <div className="space-y-4">
                                <h3 className=" text-foreground ">Billing Address</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        
                                        <Textarea className="h-20 w-full" value={data.billingAddress?.street || ""} onChange={(e) => updateBillingField("street", e.target.value)} />
                                    </div>
                                    
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Country</Label>
                                        <VirtualGeoSelect
                                            value={data.billingAddress?.country || ""}
                                            options={countryOptions}
                                            placeholder="Select Country"
                                            disabled={!geoLib}
                                            onChange={(v) => setData({ ...data, billingAddress: { ...data.billingAddress, country: v, state: "", city: "" } })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>State</Label>
                                        <VirtualGeoSelect
                                            value={data.billingAddress?.state || ""}
                                            options={billingStateOptions}
                                            placeholder="Select State"
                                            disabled={!geoLib || !billingCountryCode}
                                            onChange={(v) => setData({ ...data, billingAddress: { ...data.billingAddress, state: v, city: "" } })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>City</Label>
                                        <VirtualGeoSelect
                                            value={data.billingAddress?.city || ""}
                                            options={billingCityOptions}
                                            placeholder="Select City"
                                            disabled={!geoLib || !billingStateCode}
                                            onChange={(v) => updateBillingField("city", v)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Zip Code</Label>
                                        <Input value={data.billingAddress?.zipCode || ""} onChange={(e) => updateBillingField("zipCode", e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2 w-full">
                                    <Checkbox id="same-as-billing" checked={sameAsBilling} onCheckedChange={handleSameAsBillingToggle} />
                                    <Label htmlFor="same-as-billing" className="text-sm cursor-pointer">Shipping address same as billing</Label>

                                </div>
                                <div className="flex item-center justify-end">
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleUpdate("billing")}
                                        disabled={updatingSection === "billing"}
                                    >
                                        {updatingSection === "billing" && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Update
                                    </Button>
                                </div>

                                <Separator />

                                
                            </div>
                        </TabsContent>

                        {/* ── Booking Data Tab ── */}
                        <TabsContent value="booking" className="flex-1 overflow-y-auto p-6 mt-0">
                            <div className="space-y-4 ">
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Default Payment Method</Label>
                                        <Select value={data.defaultPaymentMethod} onValueChange={v => setData({ ...data, defaultPaymentMethod: v })}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent className="z-[150]" position="popper">
                                                <SelectItem value="Fattmerchant">Fattmerchant</SelectItem>
                                                <SelectItem value="Stripe">Stripe</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 w-full">
                                        <Label>Billed Amount</Label>
                                        <Input value={data.billedAmount || ""} onChange={(e) => setData({ ...data, billedAmount: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Bathrooms</Label>
                                        <Input value={data.bathrooms || ""} onChange={(e) => setData({ ...data, bathrooms: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Bedrooms</Label>
                                        <Input value={data.bedrooms || ""} onChange={(e) => setData({ ...data, bedrooms: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
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
                            <div className="flex item-center justify-end">
                                <Button
                                    className="flex-1"
                                    onClick={() => handleUpdate("booking")}
                                    disabled={updatingSection === "booking"}
                                >
                                    {updatingSection === "booking" && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Update
                                </Button>
                            </div>
                            </div>
                        </TabsContent>

                        {/* ── Service Defaults Tab ── */}
                        <TabsContent value="service" className="flex-1 overflow-y-auto p-6 mt-0">
                            <div className="w-full">
                                
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
                                                        <Input type="number" id="zipCode" name="zipCode" />
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
                                <div className="flex item-center justify-end">
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleUpdate("shipping")}
                                        disabled={updatingSection === "shipping"}
                                    >
                                        {updatingSection === "shipping" && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Update
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── Email Tab ── */}
                        <TabsContent value="email" className="flex-1 overflow-hidden p-6 mt-0">
                            <div className="flex flex-col h-full gap-4">
                                <div className="space-y-2 max-w-full">
                                    <h3 className="font-semibold text-sm">Send Email to Contact</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Select an email campaign to open and customize it for{" "}
                                        <span className="font-medium">{data.firstName} {data.lastName}</span>.
                                    </p>
                                    <Label className="text-xs">Select Email Campaign</Label>
                                    <Select
                                        onValueChange={(id) => {
                                            const campaign = emailCampaigns.find((c: any) => c._id === id);
                                            if (campaign) {
                                                handleSelectCampaign(campaign);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={campaignsLoading ? "Loading campaigns..." : "Choose campaign"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {emailCampaigns.map((campaign) => (
                                                <SelectItem key={campaign._id} value={campaign._id}>
                                                    {campaign.name} {campaign.isDefault ? "(Default)" : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col mt-4">
                                    {!selectedCampaign && (
                                        <div className="h-full border border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                                            After selecting a campaign from the dropdown, it will open here.
                                        </div>
                                    )}
                                    {selectedCampaign && (
                                        <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-sm">
                                                        {selectedCampaign.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Subject: {selectedCampaign.subject}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {selectedCampaign.isDefault && (
                                                        <p className="text-xs text-amber-500 font-medium">
                                                            This is a default campaign and cannot be edited.
                                                        </p>
                                                    )}
                                                    <div className="flex gap-2">
                                                        {!selectedCampaign.isDefault && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => router.push(`/dashboard/email-builder/${selectedCampaign._id}/edit`)}
                                                            >
                                                                Edit Campaign
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSendSelectedCampaign}
                                                            disabled={sendingEmail || !data?.email}
                                                        >
                                                            {sendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            {sendingEmail ? "Sending..." : "Send Email"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedCampaignLoading ? (
                                                <div className="flex-1 border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                                                    Loading email preview...
                                                </div>
                                            ) : (
                                                <div className="flex-1 min-h-[400px] border rounded-lg bg-background overflow-auto p-4">
                                                    {selectedCampaign.html ? (
                                                        <div
                                                            className="prose max-w-none"
                                                            // eslint-disable-next-line react/no-danger
                                                            dangerouslySetInnerHTML={{ __html: selectedCampaign.html }}
                                                        />
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground">
                                                            This campaign does not have any HTML content yet.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
