"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Maximize2, Pencil, Trash2, Check, X, Eye, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { ServiceDefaults } from "./ServiceDefaults";

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

    // Accordion states
    const [sections, setSections] = useState({
        about: true,
        billing: false,
        booking: false,
        service: false,
        shipping: false
    });

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

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!data) return <div className="p-8 text-center">Contact not found</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-lg shadow-sm border">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Services Table */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-card p-2 rounded border">
                        <Button variant="default">
                            Filter
                        </Button>
                        <div className="w-64">
                            <Input placeholder="Keywords..." />
                        </div>
                    </div>

                    <div className="bg-card rounded border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted border-b">
                                <tr>
                                    <th className="p-3 font-semibold text-muted-foreground">TECHNICIAN NAME</th>
                                    <th className="p-3 font-semibold text-muted-foreground">START DATE</th>
                                    <th className="p-3 font-semibold text-muted-foreground">SERVICE</th>
                                    <th className="p-3 font-semibold text-muted-foreground">STATUS</th>
                                    <th className="p-3 font-semibold text-muted-foreground">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Mock Data - Services not yet linked to backend */}
                                {[1, 2, 3].map((i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-3">Satish Patidar</td>
                                        <td className="p-3">2026-11-14 11:30:00</td>
                                        <td className="p-3">House Cleaning</td>
                                        <td className="p-3"><Badge>Confirmed</Badge></td>
                                        <td className="p-3 flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600"><Check className="h-3 w-3" /></Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"><X className="h-3 w-3" /></Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Customer Details */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Button variant="default">
                            <Maximize2 className="mr-2 h-4 w-4" /> Resize
                        </Button>
                        <span className="text-xs text-muted-foreground">Stax Id: {data.staxId || "N/A"}</span>
                    </div>

                    <div className="space-y-2">
                        {/* About This Customer */}
                        <AccordionItem title="About This Customer" isOpen={sections.about} onToggle={() => toggleSection('about')}>
                            <div className="space-y-4">
                                {/* Header with Name and Email */}
                                <div className="flex items-start gap-4 mb-4">
                                    {data.image ? <img src={data.image} alt="" className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-muted rounded flex items-center justify-center"><User className="h-6 w-6 text-muted-foreground" /></div>}
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">{data.name}</h3>
                                        <p className="text-primary flex items-center gap-1">{data.email} <CopyIcon /></p>
                                        <p className="text-muted-foreground flex items-center gap-1">{data.phone} <CopyIcon /></p>
                                        <a href="#" className="text-primary text-xs underline">Check keap Details</a>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>First Name</Label><Input value={data.firstName || ""} onChange={(e) => setData({ ...data, firstName: e.target.value })} /></div>
                                    <div className="space-y-1"><Label>Last Name</Label><Input value={data.lastName || ""} onChange={(e) => setData({ ...data, lastName: e.target.value })} /></div>
                                </div>
                                <div className="space-y-1 flex gap-2">
                                    <div className="flex-1">
                                        <Label>Email Address</Label>
                                        <Input value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="mt-6"><Pencil className="h-4 w-4" /></Button>
                                </div>
                                <div className="space-y-1 flex gap-2">
                                    <div className="flex-1">
                                        <Label>Stax Id</Label>
                                        <Input value={data.staxId || ""} onChange={(e) => setData({ ...data, staxId: e.target.value })} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="mt-6"><Pencil className="h-4 w-4" /></Button>
                                </div>
                                <div className="space-y-1"><Label>Phone Number</Label><Input value={data.phone || ""} onChange={(e) => setData({ ...data, phone: e.target.value })} /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>Password</Label><Input type="password" placeholder=".................." disabled /></div>
                                    <div className="space-y-1"><Label>Customer Stage</Label><Input value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })} /></div>
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
                                    <div className="space-y-1"><Label>Billing Address</Label><Input value={data.billingAddress?.street || ""} onChange={(e) => setData({ ...data, billingAddress: { ...data.billingAddress, street: e.target.value } })} /></div>
                                    <div className="space-y-1"><Label>Billing Zip Code</Label><Input value={data.billingAddress?.zipCode || ""} onChange={(e) => setData({ ...data, billingAddress: { ...data.billingAddress, zipCode: e.target.value } })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>Billing City</Label><Input value={data.billingAddress?.city || ""} onChange={(e) => setData({ ...data, billingAddress: { ...data.billingAddress, city: e.target.value } })} /></div>
                                    <div className="space-y-1"><Label>Billing State</Label>
                                        <Select value={data.billingAddress?.state} onValueChange={(v) => setData({ ...data, billingAddress: { ...data.billingAddress, state: v } })}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent><SelectItem value="California">California</SelectItem><SelectItem value="Alabama">Alabama</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-2">
                                    <Label>Select Default Shipping Address</Label>
                                    <Select>
                                        <SelectTrigger><SelectValue placeholder="Select Default Shipping Address" /></SelectTrigger>
                                        <SelectContent><SelectItem value="default">Default</SelectItem></SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>Default Shipping Address</Label><Input value={data.shippingAddress?.street || ""} onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, street: e.target.value } })} /></div>
                                    <div className="space-y-1"><Label>Shipping Zip Code</Label><Input value={data.shippingAddress?.zipCode || ""} onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, zipCode: e.target.value } })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><Label>Shipping City</Label><Input value={data.shippingAddress?.city || ""} onChange={(e) => setData({ ...data, shippingAddress: { ...data.shippingAddress, city: e.target.value } })} /></div>
                                    <div className="space-y-1"><Label>Shipping State</Label>
                                        <Select value={data.shippingAddress?.state} onValueChange={(v) => setData({ ...data, shippingAddress: { ...data.shippingAddress, state: v } })}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent><SelectItem value="California">California</SelectItem><SelectItem value="Alabama">Alabama</SelectItem></SelectContent>
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
        </div>
    );
}

function CopyIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy cursor-pointer hover:text-primary">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
    );
}
