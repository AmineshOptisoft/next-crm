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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";

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
    category: "main" | "sub" | "addon";
    estimatedTime?: number;
    isDefaultService?: boolean;
}

interface DefaultServiceSelection {
    selected: boolean;
    basePrice: number;
    hourlyRate: number;
    estimatedTime: number;
    percentage: number;
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
        hasParent: false,
        category: "main" as "main" | "sub" | "addon",
        estimatedTime: 0
    });

    const [subServices, setSubServices] = useState<SubService[]>([]);
    const [newSubService, setNewSubService] = useState<SubService>({ name: "", price: 0 });
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [isDefaultSheetOpen, setIsDefaultSheetOpen] = useState(false);
    const [defaultServices, setDefaultServices] = useState<Service[]>([]);
    const [defaultServiceSelections, setDefaultServiceSelections] = useState<Record<string, DefaultServiceSelection>>({});
    const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
    const [isImportingDefaults, setIsImportingDefaults] = useState(false);

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
            const res = await fetch("/api/upload?subfolder=services", {
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

    async function fetchDefaultServices() {
        setIsLoadingDefaults(true);
        try {
            let res = await fetch("/api/services/defaults");
            if (!res.ok) {
                toast.error("Failed to load default services");
                return;
            }
            let data: Service[] = await res.json();
            if (data.length === 0) {
                const seedRes = await fetch("/api/services/defaults", { method: "POST" });
                if (seedRes.ok) {
                    res = await fetch("/api/services/defaults");
                    if (res.ok) {
                        data = await res.json();
                    }
                }
            }
            setDefaultServices(data);
            const nextSelections: Record<string, DefaultServiceSelection> = {};
            data.forEach((service) => {
                nextSelections[service._id] = {
                    selected: false,
                    basePrice: service.basePrice || 0,
                    hourlyRate: service.hourlyRate || 0,
                    estimatedTime: service.estimatedTime || 0,
                    percentage: service.percentage || 0,
                };
            });
            setDefaultServiceSelections(nextSelections);
        } catch (error) {
            console.error(error);
            toast.error("Error loading default services");
        } finally {
            setIsLoadingDefaults(false);
        }
    }

    function toggleDefaultSelection(id: string, checked: boolean) {
        setDefaultServiceSelections((prev) => ({
            ...prev,
            [id]: {
                ...(prev[id] || { selected: false, basePrice: 0, hourlyRate: 0, estimatedTime: 0, percentage: 0 }),
                selected: checked,
            },
        }));
    }

    function updateDefaultPricing(id: string, field: keyof Omit<DefaultServiceSelection, "selected">, value: number) {
        setDefaultServiceSelections((prev) => ({
            ...prev,
            [id]: {
                ...(prev[id] || { selected: false, basePrice: 0, hourlyRate: 0, estimatedTime: 0, percentage: 0 }),
                [field]: value,
            },
        }));
    }

    async function handleSaveDefaultServices() {
        const selectedIds = Object.entries(defaultServiceSelections)
            .filter(([, value]) => value.selected)
            .map(([id]) => id);

        if (selectedIds.length === 0) {
            toast.error("Select at least one service");
            return;
        }

        const selections = selectedIds.map((id) => ({
            defaultServiceId: id,
            basePrice: defaultServiceSelections[id].basePrice,
            hourlyRate: defaultServiceSelections[id].hourlyRate,
            estimatedTime: defaultServiceSelections[id].estimatedTime,
            percentage: defaultServiceSelections[id].percentage,
        }));

        setIsImportingDefaults(true);
        try {
            const res = await fetch("/api/services/defaults/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selections }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data?.error || "Failed to import services");
                return;
            }

            toast.success(`${data.createdCount || 0} services imported`);
            setIsDefaultSheetOpen(false);
            fetchServices();
        } catch (error) {
            console.error(error);
            toast.error("Failed to import services");
        } finally {
            setIsImportingDefaults(false);
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
            hasParent: false,
            category: "main",
            estimatedTime: 0
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
            hasParent: !!service.parentId,
            category: service.category || "main",
            estimatedTime: service.estimatedTime || 0
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

        // Parent ID validation for Sub and Addon
        if ((formData.category === "sub" || formData.category === "addon") && !formData.parentId) {
            toast.error(`Please select a parent service for this ${formData.category} service`);
            return;
        }

        const payload = {
            ...formData,
            parentId: formData.category !== "main" ? formData.parentId : null,
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

    function handleDelete(id: string) {
        setIdToDelete(id);
        setIsDeleteDialogOpen(true);
    }

    async function confirmDelete() {
        if (!idToDelete) return;
        setDeletingId(idToDelete);
        try {
            const res = await fetch(`/api/services/${idToDelete}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Service deleted");
                fetchServices();
                setIsDeleteDialogOpen(false);
            } else {
                toast.error("Failed to delete service");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting service");
        } finally {
            setDeletingId(null);
            if (!idToDelete) setIdToDelete(null);
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

    const defaultMainServices = defaultServices.filter((service) => service.category === "main");
    const defaultChildrenByParent = defaultServices.reduce<Record<string, Service[]>>((acc, service) => {
        if (service.parentId) {
            const key = String(service.parentId);
            if (!acc[key]) acc[key] = [];
            acc[key].push(service);
        }
        return acc;
    }, {});

    const servicesByParent = services.reduce<Record<string, Service[]>>((acc, service) => {
        const key = service.parentId ? String(service.parentId) : "root";
        if (!acc[key]) acc[key] = [];
        acc[key].push(service);
        return acc;
    }, {});

    const sortedMainServices = (servicesByParent["root"] || []).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Services</h1>
                    <p className="text-muted-foreground">
                        Manage your services and sub-services offerings
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Sheet
                        open={isDefaultSheetOpen}
                        onOpenChange={(open) => {
                            setIsDefaultSheetOpen(open);
                            if (open) fetchDefaultServices();
                        }}
                    >
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Default Services
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-xl md:max-w-4xl overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>Select Default Services</SheetTitle>
                                <SheetDescription>
                                    Choose main services first, then pick related sub-services/addons and set pricing.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                                {isLoadingDefaults ? (
                                    <p className="text-sm text-muted-foreground">Loading default services...</p>
                                ) : defaultMainServices.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No default services found.</p>
                                ) : (
                                    defaultMainServices.map((main) => {
                                        const mainSelection = defaultServiceSelections[main._id];
                                        const isMainSelected = !!mainSelection?.selected;
                                        const children = defaultChildrenByParent[String(main._id)] || [];

                                        return (
                                            <div key={main._id} className="rounded-lg border p-4 space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        checked={isMainSelected}
                                                        onCheckedChange={(checked) => toggleDefaultSelection(main._id, !!checked)}
                                                    />
                                                    <div>
                                                        <p className="font-semibold">{main.name}</p>
                                                        {main.description && (
                                                            <p className="text-sm text-muted-foreground">{main.description}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {isMainSelected && children.length > 0 && (
                                                    <div className="space-y-3 pl-7">
                                                        {children.map((child) => {
                                                            const childSelection = defaultServiceSelections[child._id];
                                                            const isChildSelected = !!childSelection?.selected;
                                                            return (
                                                                <div key={child._id} className="rounded-md border p-3 space-y-3">
                                                                    <div className="flex items-start gap-3">
                                                                        <Checkbox
                                                                            checked={isChildSelected}
                                                                            onCheckedChange={(checked) => toggleDefaultSelection(child._id, !!checked)}
                                                                        />
                                                                        <div>
                                                                            <p className="font-medium">
                                                                                {child.name}
                                                                                <span className="ml-2 text-xs uppercase text-muted-foreground">{child.category}</span>
                                                                            </p>
                                                                            {child.description && (
                                                                                <p className="text-sm text-muted-foreground">{child.description}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {isChildSelected && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-7">
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Base Price"
                                                                                value={childSelection?.basePrice ?? 0}
                                                                                onChange={(e) => updateDefaultPricing(child._id, "basePrice", parseFloat(e.target.value) || 0)}
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Hourly Rate"
                                                                                value={childSelection?.hourlyRate ?? 0}
                                                                                onChange={(e) => updateDefaultPricing(child._id, "hourlyRate", parseFloat(e.target.value) || 0)}
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Estimated Time (min)"
                                                                                value={childSelection?.estimatedTime ?? 0}
                                                                                onChange={(e) => updateDefaultPricing(child._id, "estimatedTime", parseInt(e.target.value) || 0)}
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Range Percentage"
                                                                                value={childSelection?.percentage ?? 0}
                                                                                onChange={(e) => updateDefaultPricing(child._id, "percentage", parseFloat(e.target.value) || 0)}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <SheetFooter className="mt-6">
                                <Button variant="outline" onClick={() => setIsDefaultSheetOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveDefaultServices} disabled={isImportingDefaults}>
                                    {isImportingDefaults ? "Saving..." : "Save Selected Services"}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
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
                    <SheetContent className="w-full sm:max-w-xl md:max-w-5xl overflow-y-auto p-0">
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

                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Service Category</Label>
                                    <RadioGroup
                                        value={formData.category}
                                        onValueChange={(val: any) => {
                                            setFormData({
                                                ...formData,
                                                category: val,
                                                hasParent: val !== "main",
                                                parentId: val === "main" ? "" : formData.parentId
                                            });
                                        }}
                                        className="flex gap-4 p-4 rounded-lg border bg-muted/20"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="main" id="category-main" />
                                            <Label htmlFor="category-main" className="cursor-pointer font-medium">Main</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="sub" id="category-sub" />
                                            <Label htmlFor="category-sub" className="cursor-pointer font-medium">Sub</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="addon" id="category-addon" />
                                            <Label htmlFor="category-addon" className="cursor-pointer font-medium">Addon</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Parent Service Selection - Conditional */}
                                {formData.category !== "main" && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-base font-semibold">
                                            Select Parent Service <span className="text-destructive">*</span>
                                        </Label>
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
                                                        // Filter out services that are already children (keep only root/main services as parents)
                                                        (s.category === "main" || !s.parentId)
                                                    )
                                                    .map(service => (
                                                        <SelectItem key={service._id} value={service._id}>
                                                            {service.name}
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            {formData.category === "sub" ? "Choose which main service this sub-service belongs to." : "Choose which service this addon belongs to."}
                                        </p>
                                    </div>
                                )}

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
                                {/* Percentage - Only for Sub and Addon */}
                                {formData.category !== "main" && (
                                    <div className="space-y-3">
                                        <Label className="text-base font-semibold">Range Percentage (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.percentage}
                                            onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="h-11 appearance-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Price Fields - Only for Sub and Addon */}
                            {formData.category !== "main" && (
                                <div className="grid md:grid-cols-3 grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-2">
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
                                    <div className="space-y-3">
                                        <Label className="text-base font-semibold">Estimated Time (minutes)</Label>
                                        <Input
                                            type="number"
                                            value={formData.estimatedTime}
                                            onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="h-11"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="p-6 bg-background/80 backdrop-blur-sm border-t flex items-center gap-4 justify-end">
                                <SheetClose asChild>
                                    <Button type="button" variant="outline" size="lg" className="min-w-[100px]">
                                        Cancel
                                    </Button>
                                </SheetClose>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="min-w-[140px] shadow-sm"
                                    disabled={isSaving}
                                >
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingService ? "Update" : "Create"}
                                </Button>
                            </div>
                        </form>
                    </SheetContent >
                    </Sheet >
                </div>
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
                                    <TableHead>ESTIMATED TIME</TableHead>
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
                                    sortedMainServices.flatMap((mainService, mainIndex) => {
                                        const children = (servicesByParent[String(mainService._id)] || []).sort((a, b) => a.name.localeCompare(b.name));
                                        const rows: React.ReactNode[] = [];

                                        rows.push(
                                            <TableRow key={mainService._id}>
                                                <TableCell>{mainIndex + 1}</TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        {mainService.logo && <img src={mainService.logo} alt="" className="h-6 w-6 object-cover rounded" />}
                                                        <span>{mainService.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                                            {mainService.category || "main"}
                                                        </span>
                                                        <span>
                                                            {mainService.availability === 'new_client' ? 'New Client' :
                                                                mainService.availability === 'existing_client' ? 'Existing Client' :
                                                                    mainService.availability === 'admin_service' ? 'Admin Service' : 'Both'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>--</TableCell>
                                                <TableCell>--</TableCell>
                                                <TableCell>--</TableCell>
                                                <TableCell>--</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={mainService.status === "active"}
                                                            onCheckedChange={() => handleStatusToggle(mainService)}
                                                            className="data-[state=checked]:bg-green-600"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(mainService)} className="hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(mainService._id)} className="hover:bg-red-50 hover:text-red-600 transition-colors" disabled={deletingId === mainService._id}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );

                                        children.forEach((child) => {
                                            rows.push(
                                                <TableRow key={child._id}>
                                                    <TableCell />
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2 pl-6">
                                                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                                                            {child.logo && <img src={child.logo} alt="" className="h-6 w-6 object-cover rounded" />}
                                                            <span>{child.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                                                {child.category}
                                                            </span>
                                                            <span>
                                                                {child.availability === 'new_client' ? 'New Client' :
                                                                    child.availability === 'existing_client' ? 'Existing Client' :
                                                                        child.availability === 'admin_service' ? 'Admin Service' : 'Both'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{`${child.percentage || 0}%`}</TableCell>
                                                    <TableCell>{`$${child.basePrice || 0}`}</TableCell>
                                                    <TableCell>{`$${child.hourlyRate || 0}/hr`}</TableCell>
                                                    <TableCell>{`${child.estimatedTime || 0} min`}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={child.status === "active"}
                                                                onCheckedChange={() => handleStatusToggle(child)}
                                                                className="data-[state=checked]:bg-green-600"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(child)} className="hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(child._id)} className="hover:bg-red-50 hover:text-red-600 transition-colors" disabled={deletingId === child._id}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        });

                                        return rows;
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )
            }
            {/* Delete Confirmation Dialog */}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Service</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this service? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setIdToDelete(null);
                            }}
                            disabled={deletingId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deletingId !== null}
                        >
                            {deletingId ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

