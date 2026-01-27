"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, Trash2, Pencil } from "lucide-react";
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

interface ServiceArea {
    _id: string;
    name: string;
}

export function CompanyServiceAreas() {
    const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);
    const [formData, setFormData] = useState({ name: "" });

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
            alert("Please enter a service area name");
            return;
        }

        try {
            const url = editingArea
                ? `/api/service-areas/${editingArea._id}`
                : "/api/service-areas";
            const method = editingArea ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setIsSheetOpen(false);
                setFormData({ name: "" });
                setEditingArea(null);
                fetchServiceAreas();
                alert(
                    editingArea
                        ? "Service area updated successfully!"
                        : "Service area added successfully!"
                );
            } else {
                const error = await response.json();
                alert(error.error || "Failed to save service area");
            }
        } catch (error) {
            console.error("Error saving service area:", error);
            alert("Error saving service area");
        }
    };

    const handleEdit = (area: ServiceArea) => {
        setEditingArea(area);
        setFormData({ name: area.name });
        setIsSheetOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service area?")) return;

        try {
            const response = await fetch(`/api/service-areas/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchServiceAreas();
                alert("Service area deleted successfully!");
            } else {
                const error = await response.json();
                alert(error.error || "Failed to delete service area");
            }
        } catch (error) {
            console.error("Error deleting service area:", error);
            alert("Error deleting service area");
        }
    };

    const handleOpenSheet = () => {
        setEditingArea(null);
        setFormData({ name: "" });
        setIsSheetOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                    <CardTitle>Service Areas</CardTitle>
                    <CardDescription>
                        Manage your service zone names
                    </CardDescription>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button onClick={handleOpenSheet}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Service Area
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 border-l shadow-2xl">
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
                                    onChange={(e) =>
                                        setFormData({ name: e.target.value })
                                    }
                                    className="h-10"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t bg-muted/10 mt-auto">
                            <SheetFooter className="flex-col sm:flex-row gap-3 sm:space-x-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSheetOpen(false)}
                                    className="w-full sm:w-1/2"
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} className="w-full sm:w-1/2">
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
                                                onClick={() => handleDelete(area._id)}
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
        </Card>
    );
}
