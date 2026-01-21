"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface SubService {
    name: string;
    description?: string;
    price?: number;
}

interface Service {
    _id: string;
    name: string;
    description?: string;
    logo?: string;
    availability: "new_client" | "existing_client" | "both" | "admin_service";
    percentage?: number;
    priceType: "fixed" | "hourly";
    basePrice?: number;
    hourlyRate?: number;
    status: string;
    subServices: SubService[];
    companyId: string;
    parentId?: string;
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        logo: "",
        description: "",
        availability: "both",
        percentage: 0,
        priceType: "fixed" as "fixed" | "hourly",
        basePrice: 0,
        hourlyRate: 0,
        status: "active",
        parentId: "",
        hasParent: false
    });

    const [subServices, setSubServices] = useState<SubService[]>([]);
    const [newSubService, setNewSubService] = useState<SubService>({ name: "", price: 0 });
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    }

    async function uploadFile(file: File) {
        setIsUploading(true);
        const data = new FormData();
        data.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            });

            if (res.ok) {
                const json = await res.json();
                setFormData(prev => ({ ...prev, logo: json.url }));
                toast.success("Logo uploaded successfully");
            } else {
                toast.error("Failed to upload logo");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Error uploading logo");
        } finally {
            setIsUploading(false);
        }
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            uploadFile(file);
        }
    }

    useEffect(() => {
        fetchServices();
    }, []);

    async function fetchServices() {
        try {
            const res = await fetch("/api/services");
            if (res.ok) {
                const data = await res.json();
                setServices(data);
            } else {
                toast.error("Failed to fetch services");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading services");
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setEditingService(null);
        setFormData({
            name: "",
            logo: "",
            description: "",
            availability: "both",
            percentage: 0,
            priceType: "fixed",
            basePrice: 0,
            hourlyRate: 0,
            status: "active",
            parentId: "",
            hasParent: false
        });
        setSubServices([]);
        setNewSubService({ name: "", price: 0 });
    }

    function handleEdit(service: Service) {
        setEditingService(service);
        setFormData({
            name: service.name,
            logo: service.logo || "",
            description: service.description || "",
            availability: service.availability || "both",
            percentage: service.percentage || 0,
            priceType: service.priceType || "fixed",
            basePrice: service.basePrice || 0,
            hourlyRate: service.hourlyRate || 0,
            status: service.status || "active",
            parentId: service.parentId || "",
            hasParent: !!service.parentId
        });
        setSubServices(service.subServices || []);
        setIsSheetOpen(true);
    }

    function addSubService() {
        if (!newSubService.name) {
            toast.error("Sub-service name is required");
            return;
        }
        setSubServices([...subServices, newSubService]);
        setNewSubService({ name: "", price: 0 });
    }

    function removeSubService(index: number) {
        const updated = [...subServices];
        updated.splice(index, 1);
        setSubServices(updated);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Service name is required");
            return;
        }

        const payload = {
            ...formData,
            parentId: formData.hasParent ? formData.parentId : null,
            subServices,
        };

        setIsSaving(true);

        try {
            const url = editingService
                ? `/api/services/${editingService._id}`
                : "/api/services";
            const method = editingService ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(
                    editingService
                        ? "Service updated successfully"
                        : "Service created successfully"
                );
                setIsSheetOpen(false);
                fetchServices();
                resetForm();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save service");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error saving service");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Service deleted");
                fetchServices();
            } else {
                toast.error("Failed to delete service");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting service");
        }
    }

    async function handleStatusToggle(service: Service) {
        const newStatus = service.status === "active" ? "inactive" : "active";

        try {
            const res = await fetch(`/api/services/${service._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...service, status: newStatus }),
            });

            if (res.ok) {
                toast.success(`Service ${newStatus === "active" ? "activated" : "deactivated"}`);
                fetchServices();
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating status");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Services</h1>
                    <p className="text-muted-foreground">
                        Manage your services and sub-services offerings
                    </p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) resetForm();
                }}>
                    <SheetTrigger asChild>
                        <Button onClick={resetForm} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Service
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl  overflow-y-auto p-0">
                        <div className="p-0 pb-0">
                            <SheetHeader className="mb-0">
                                <SheetTitle className="text-2xl font-bold">
                                    {editingService ? "Edit Service" : "Create Service"}
                                </SheetTitle>

                            </SheetHeader>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-2">
                            {/* Logo Upload Simulation */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Service Logo</Label>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                    className={`border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:bg-muted/50 w-full max-w-[220px] ${isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 bg-muted/5"
                                        }`}
                                >
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />

                                    {isUploading ? (
                                        <div className="flex items-center gap-2 py-2">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span className="text-sm text-muted-foreground">Uploading...</span>
                                        </div>
                                    ) : formData.logo ? (
                                        <div className="relative w-full h-40 flex items-center justify-center rounded-md border-0" onClick={(e) => e.stopPropagation()}>
                                            <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFormData({ ...formData, logo: "" });
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 text-center">
                                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-1">
                                                <ImageIcon className="h-5 w-5" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                                            <p className="text-[10px] text-muted-foreground">Best: Square JPG/PNG</p>
                                        </div>
                                    )}
                                </div>
                            </div>


                            <div className="grid gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="name" className="text-base font-semibold">
                                        Service Title <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. House Cleaning"
                                        className="h-11"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="h-35"
                                    />
                                </div>

                                {/* Parent Service Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-semibold">Have Parent Service?</Label>
                                            <div className="text-sm text-muted-foreground">
                                                Enable to link this service to a parent
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.hasParent}
                                            onCheckedChange={(checked) => setFormData({ ...formData, hasParent: checked, parentId: checked ? formData.parentId : "" })}
                                        />
                                    </div>

                                    {formData.hasParent && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-base font-semibold">Select Parent Service</Label>
                                            <Select
                                                value={formData.parentId}
                                                onValueChange={(val: any) => setFormData({ ...formData, parentId: val })}
                                            >
                                                <SelectTrigger className="h-11 w-full text-left">
                                                    <SelectValue placeholder="Select a parent service..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {services
                                                        .filter(s =>
                                                            // Filter out current service if editing
                                                            (editingService ? s._id !== editingService._id : true) &&
                                                            // Filter out services that are already children (keep only root services)
                                                            !s.parentId
                                                        )
                                                        .map(service => (
                                                            <SelectItem key={service._id} value={service._id}>
                                                                {service.name}
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-semibold">Status</Label>
                                            <div className="text-sm text-muted-foreground">
                                                {formData.status === "active" ? "Active" : "Inactive"}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.status === "active"}
                                            onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Availability</Label>
                                    <Select
                                        value={formData.availability}
                                        onValueChange={(val: any) => setFormData({ ...formData, availability: val })}
                                    >
                                        <SelectTrigger className="h-11 w-full text-left">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new_client">New Client Only</SelectItem>
                                            <SelectItem value="existing_client">Existing Client Only</SelectItem>
                                            <SelectItem value="both">Both</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Range Percentage (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.percentage}
                                        onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Base Price ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.basePrice}
                                        onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Hourly Rate ($/hr)</Label>
                                    <Input
                                        type="number"
                                        value={formData.hourlyRate}
                                        onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                        className="h-11"
                                    />
                                </div>
                            </div>


                            <div className="p-6 bg-background/80 backdrop-blur-sm border-t flex items-center gap-4 justify-end">
                                <SheetClose asChild>
                                    <Button type="button" variant="outline" size="lg" className="min-w-[100px]">
                                        Cancel
                                    </Button>
                                </SheetClose>
                                <Button type="submit" size="lg" className="min-w-[140px]  shadow-sm" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingService ? "Update Service" : "Save Service"}
                                </Button>
                            </div>
                        </form>
                    </SheetContent >
                </Sheet >
            </div >

            {
                loading ? (
                    <div className="py-12 text-center" >
                        <p className="text-muted-foreground">Loading services...</p>
                    </div>
                ) : (
                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">SN.</TableHead>
                                    <TableHead>SERVICE NAME</TableHead>
                                    <TableHead>SERVICE TYPE</TableHead>
                                    <TableHead>SERVICE PERCENTAGE</TableHead>
                                    <TableHead>BASE PRICE</TableHead>
                                    <TableHead>HOURLY RATE</TableHead>
                                    <TableHead>STATUS</TableHead>
                                    <TableHead className="text-right">ACTION</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            No services found. Add one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    services.map((service, index) => (
                                        <TableRow key={service._id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {/* Colored dot indicator */}
                                                    <div className={`w-2 h-2 rounded-full ${service.parentId ? 'bg-orange-400' : 'bg-blue-500'}`} />
                                                    {service.logo && <img src={service.logo} alt="" className="h-6 w-6 object-cover rounded" />}
                                                    <span>{service.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {service.availability === 'new_client' ? 'New Client' :
                                                    service.availability === 'existing_client' ? 'Existing Client' :
                                                        service.availability === 'admin_service' ? 'Admin Service' : 'Both'}
                                            </TableCell>
                                            <TableCell>
                                                {service.percentage || 0}%
                                            </TableCell>
                                            <TableCell>
                                                ${service.basePrice || 0}
                                            </TableCell>
                                            <TableCell>
                                                ${service.hourlyRate || 0}/hr
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={service.status === "active"}
                                                        onCheckedChange={() => handleStatusToggle(service)}
                                                        className="data-[state=checked]:bg-green-600"
                                                    />
                                                    <span className={`text-sm font-medium ${service.status === "active" ? "text-green-600" : "text-gray-500"}`}>
                                                        {/* {service.status === "active" ? "Active" : "Inactive"} */}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(service)}
                                                        className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(service._id)}
                                                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )
            }
        </div >
    );
}
