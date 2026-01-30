"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, Trash2, Search } from "lucide-react";
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

interface ZipCode {
    _id: string;
    code: string;
    serviceAreaId: {
        _id: string;
        name: string;
    };
}

export function CompanyZipCodes() {
    const [zipCodes, setZipCodes] = useState<ZipCode[]>([]);
    const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        serviceAreaId: "",
        code: "",
    });

    useEffect(() => {
        fetchZipCodes();
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

    const fetchZipCodes = async () => {
        try {
            const response = await fetch("/api/zip-codes");
            if (response.ok) {
                const data = await response.json();
                setZipCodes(data);
            }
        } catch (error) {
            console.error("Error fetching zip codes:", error);
        }
    };

    const handleSubmit = async () => {
        if (!formData.serviceAreaId || !formData.code.trim()) {
            alert("Please select a service area and enter a zip code");
            return;
        }

        try {
            const response = await fetch("/api/zip-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setIsSheetOpen(false);
                setFormData({ serviceAreaId: "", code: "" });
                fetchZipCodes();
                alert("Zip code added successfully!");
            } else {
                const error = await response.json();
                alert(error.error || "Failed to add zip code");
            }
        } catch (error) {
            console.error("Error adding zip code:", error);
            alert("Error adding zip code");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this zip code?")) return;

        try {
            const response = await fetch(`/api/zip-codes/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchZipCodes();
                alert("Zip code deleted successfully!");
            } else {
                const error = await response.json();
                alert(error.error || "Failed to delete zip code");
            }
        } catch (error) {
            console.error("Error deleting zip code:", error);
            alert("Error deleting zip code");
        }
    };

    const filteredZipCodes = zipCodes.filter(
        (zip) =>
            zip.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            zip.serviceAreaId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="py-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                    <CardTitle>Zip Codes</CardTitle>
                    <CardDescription>
                        Manage zip codes for your service areas
                    </CardDescription>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Zip Code
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
                                        <SheetTitle className="text-xl">Add New Zip Code</SheetTitle>
                                        <SheetDescription className="text-sm">
                                            Select a service area and enter zip code
                                        </SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="serviceArea" className="text-sm font-medium">
                                    Zone Name
                                </Label>
                                {serviceAreas.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No service areas available. Please add a service area first.
                                    </p>
                                ) : (
                                    <Select
                                        value={formData.serviceAreaId}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, serviceAreaId: val })
                                        }
                                    >
                                        <SelectTrigger className="w-full h-10">
                                            <SelectValue placeholder="Select Zone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {serviceAreas.map((area) => (
                                                <SelectItem key={area._id} value={area._id}>
                                                    {area.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zipCode" className="text-sm font-medium">
                                    Zip Code
                                </Label>
                                <Input
                                    id="zipCode"
                                    placeholder="e.g. 92101"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value })
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
                                <Button
                                    onClick={handleSubmit}
                                    className="w-full sm:w-1/2"
                                    disabled={serviceAreas.length === 0}
                                >
                                    Add Zip Code
                                </Button>
                            </SheetFooter>
                        </div>
                    </SheetContent>
                </Sheet>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by zip code or zone name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Table */}
                {filteredZipCodes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        {zipCodes.length === 0
                            ? "No zip codes found. Add one to get started."
                            : "No zip codes match your search."}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>ZONE NAME</TableHead>
                                <TableHead>ZIP CODE</TableHead>
                                <TableHead className="text-right">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredZipCodes.map((zip, index) => (
                                <TableRow key={zip._id}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{zip.serviceAreaId?.name || "N/A"}</TableCell>
                                    <TableCell className="font-mono">{zip.code}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                            onClick={() => handleDelete(zip._id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
