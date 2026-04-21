"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Plus, Trash2, Pencil } from "lucide-react";
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
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ServiceArea {
    _id: string;
    name: string;
}

export function CompanyServiceAreas() {
    const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);
    const [formData, setFormData] = useState({ name: "" });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [areaToDelete, setAreaToDelete] = useState<string | null>(null);
    const [availableZipCodes, setAvailableZipCodes] = useState<string[]>([]);
    const [selectedZipCodes, setSelectedZipCodes] = useState<string[]>([]);
    const [isLoadingZipCodes, setIsLoadingZipCodes] = useState(false);

    useEffect(() => {
        fetchServiceAreas();
    }, []);

    const fetchServiceAreas = async () => {
        try {
            const response = await fetch("/api/service-areas");
            if (response.ok) {
                const data = await response.json();
                setServiceAreas(data);
            }
        } catch (error) {
            console.error("Error fetching service areas:", error);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Please enter a service area name");
            return;
        }

        if (!editingArea && selectedZipCodes.length === 0) {
            toast.error("Please fetch and select at least one zip code");
            return;
        }

        try {
            const url = editingArea
                ? `/api/service-areas/${editingArea._id}`
                : "/api/service-areas";
            const method = editingArea ? "PUT" : "POST";
            const payload = editingArea
                ? { name: formData.name }
                : { name: formData.name, zipCodes: selectedZipCodes };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                setIsSheetOpen(false);
                setFormData({ name: "" });
                setEditingArea(null);
                setAvailableZipCodes([]);
                setSelectedZipCodes([]);
                fetchServiceAreas();
                window.dispatchEvent(new CustomEvent("zip-codes:refresh"));
                toast.success(
                    editingArea
                        ? "Service area updated successfully!"
                        : "Service area added successfully!"
                );

                if (!editingArea && Array.isArray(data?.selectedZipCodes)) {
                    toast.success(
                        `${data.totalSavedZipCodes ?? data.selectedZipCodes.length} zip code(s) saved for this area.`
                    );
                }
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to save service area");
            }
        } catch (error) {
            console.error("Error saving service area:", error);
            toast.error("Error saving service area");
        }
    };

    const handleEdit = (area: ServiceArea) => {
        setEditingArea(area);
        setFormData({ name: area.name });
        setIsSheetOpen(true);
    };

    const openDeleteConfirm = (id: string) => {
        setAreaToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!areaToDelete) return;
        try {
            const response = await fetch(`/api/service-areas/${areaToDelete}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setDeleteConfirmOpen(false);
                setAreaToDelete(null);
                fetchServiceAreas();
                toast.success("Service area deleted successfully!");
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to delete service area");
            }
        } catch (error) {
            console.error("Error deleting service area:", error);
            toast.error("Error deleting service area");
        }
    };

    const handleOpenSheet = () => {
        setEditingArea(null);
        setFormData({ name: "" });
        setAvailableZipCodes([]);
        setSelectedZipCodes([]);
        setIsSheetOpen(true);
    };

    const handleSheetOpenChange = (open: boolean) => {
        setIsSheetOpen(open);
        if (!open) {
            setEditingArea(null);
            setFormData({ name: "" });
            setAvailableZipCodes([]);
            setSelectedZipCodes([]);
            setIsLoadingZipCodes(false);
        }
    };

    const toggleZipCodeSelection = (zipCode: string, checked: boolean) => {
        setSelectedZipCodes((prev) => {
            if (checked) {
                if (prev.includes(zipCode)) return prev;
                return [...prev, zipCode];
            }
            return prev.filter((item) => item !== zipCode);
        });
    };

    const handleFetchZipCodes = async () => {
        if (!formData.name.trim()) {
            toast.error("Please enter a service area name first");
            return;
        }

        setIsLoadingZipCodes(true);
        try {
            const response = await fetch(
                `/api/service-areas/zip-preview?location=${encodeURIComponent(formData.name.trim())}`
            );
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to fetch zip codes");
                setAvailableZipCodes([]);
                setSelectedZipCodes([]);
                return;
            }

            const zipCodes = Array.isArray(data?.zipCodes) ? data.zipCodes : [];
            setAvailableZipCodes(zipCodes);
            setSelectedZipCodes(zipCodes);

            if (zipCodes.length === 0) {
                toast.info("No zip codes found for this location.");
            } else {
                toast.success(`${zipCodes.length} zip code(s) found. Select the ones you need.`);
            }
        } catch (error) {
            console.error("Error fetching zip code preview:", error);
            toast.error("Error fetching zip codes");
            setAvailableZipCodes([]);
            setSelectedZipCodes([]);
        } finally {
            setIsLoadingZipCodes(false);
        }
    };

    return (
        <Card className="py-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                    <CardTitle>Service Areas</CardTitle>
                    <CardDescription>
                        Manage your service zone names
                    </CardDescription>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
                    <SheetTrigger asChild>
                        <Button onClick={handleOpenSheet}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Service Area
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-5xl flex flex-col h-full p-0 border-l shadow-2xl">
                        <div className="p-6 border-b bg-gradient-to-r from-muted/50 to-muted/20">
                            <SheetHeader className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-full">
                                        <MapPin className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <SheetTitle className="text-xl">
                                            {editingArea ? "Edit Service Area" : "Add Service Area"}
                                        </SheetTitle>
                                        <SheetDescription className="text-sm">
                                            {editingArea
                                                ? "Update the service area name"
                                                : "Create a new service zone"}
                                        </SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Zone Name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. San Diego, La Mesa"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ name: e.target.value });
                                        if (!editingArea) {
                                            setAvailableZipCodes([]);
                                            setSelectedZipCodes([]);
                                        }
                                    }}
                                    className="h-10"
                                />
                            </div>
                            {!editingArea && (
                                <div className="space-y-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleFetchZipCodes}
                                        disabled={isLoadingZipCodes || !formData.name.trim()}
                                    >
                                        {isLoadingZipCodes ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Fetching zip codes...
                                            </>
                                        ) : (
                                            "Fetch Zip Codes"
                                        )}
                                    </Button>

                                    {availableZipCodes.length > 0 && (
                                        <div className="space-y-2 rounded-md border p-3">
                                            <p className="text-sm font-medium">
                                                Select zip codes for this area
                                            </p>
                                            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                                                {availableZipCodes.map((zipCode) => (
                                                    <label
                                                        key={zipCode}
                                                        className="flex items-center gap-2 text-sm"
                                                    >
                                                        <Checkbox
                                                            checked={selectedZipCodes.includes(zipCode)}
                                                            onCheckedChange={(checked) =>
                                                                toggleZipCodeSelection(
                                                                    zipCode,
                                                                    Boolean(checked)
                                                                )
                                                            }
                                                        />
                                                        <span>{zipCode}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-muted/10 mt-auto">
                            <SheetFooter className="flex-col sm:flex-row justify-end gap-3 sm:space-x-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSheetOpen(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} className="w-full sm:w-auto">
                                    {editingArea ? "Update" : "Add"} Service Area
                                </Button>
                            </SheetFooter>
                        </div>
                    </SheetContent>
                </Sheet>
            </CardHeader>
            <CardContent>
                {serviceAreas.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        No service areas found. Add one to get started.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ZONE NAME</TableHead>
                                <TableHead className="text-right">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {serviceAreas.map((area) => (
                                <TableRow key={area._id}>
                                    <TableCell className="font-medium">{area.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-primary hover:text-primary/90 hover:bg-primary/10"
                                                onClick={() => handleEdit(area)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                onClick={() => openDeleteConfirm(area._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete service area</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this service area? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
