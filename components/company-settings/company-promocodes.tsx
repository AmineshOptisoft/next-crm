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
import { TicketPercent, Plus, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { Promocode } from "./types";

export function CompanyPromocodes() {
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [isPromocodeDialogOpen, setIsPromocodeDialogOpen] = useState(false);
    const [newPromocode, setNewPromocode] = useState({
        code: "",
        type: "percentage",
        value: "",
        limit: "",
        expiryDate: ""
    });

    useEffect(() => {
        fetchPromocodes();
    }, []);

    const fetchPromocodes = async () => {
        try {
            const response = await fetch("/api/promocodes");
            if (response.ok) {
                const data = await response.json();
                setPromocodes(data);
            }
        } catch (error) {
            console.error("Error fetching promocodes:", error);
        }
    };

    const handleCreatePromocode = async () => {
        try {
            const response = await fetch("/api/promocodes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPromocode),
            });

            if (response.ok) {
                setIsPromocodeDialogOpen(false);
                setNewPromocode({
                    code: "",
                    type: "percentage",
                    value: "",
                    limit: "",
                    expiryDate: ""
                });
                fetchPromocodes();
                alert("Promocode created successfully!");
            } else {
                const error = await response.json();
                alert(error.error || "Failed to create promocode");
            }
        } catch (error) {
            console.error("Error creating promocode:", error);
            alert("Error creating promocode");
        }
    };

    const handleDeletePromocode = async (id: string) => {
        if (!confirm("Are you sure you want to delete this promocode?")) return;
        try {
            const response = await fetch(`/api/promocodes/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchPromocodes();
            } else {
                alert("Failed to delete promocode");
            }
        } catch (error) {
            console.error("Error deleting promocode:", error);
        }
    };

    return (
        <Card className="py-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                    <CardTitle>Promocodes</CardTitle>
                    <CardDescription>
                        Manage discount coupons and promotional offers
                    </CardDescription>
                </div>
                <Sheet open={isPromocodeDialogOpen} onOpenChange={setIsPromocodeDialogOpen}>
                    <SheetTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Promocode
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 border-l shadow-2xl">
                        <div className="p-6 border-b bg-gradient-to-r from-muted/50 to-muted/20">
                            <SheetHeader className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-full">
                                        <TicketPercent className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <SheetTitle className="text-xl">Create Promocode</SheetTitle>
                                        <SheetDescription className="text-sm">
                                            Configure a new discount coupon
                                        </SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-sm font-medium">Coupon Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. SUMMER50"
                                    value={newPromocode.code}
                                    onChange={(e) => setNewPromocode({ ...newPromocode, code: e.target.value.toUpperCase() })}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-sm font-medium">Coupon Type</Label>
                                <Select
                                    value={newPromocode.type}
                                    onValueChange={(val) => setNewPromocode({ ...newPromocode, type: val as "percentage" | "flat" })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="flat">Flat Amount ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value" className="text-sm font-medium">Value</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    placeholder="0"
                                    value={newPromocode.value}
                                    onChange={(e) => setNewPromocode({ ...newPromocode, value: e.target.value })}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="limit" className="text-sm font-medium">Limit (Usage)</Label>
                                <Input
                                    id="limit"
                                    type="number"
                                    placeholder="0 for unlimited"
                                    value={newPromocode.limit}
                                    onChange={(e) => setNewPromocode({ ...newPromocode, limit: e.target.value })}
                                    className="h-10"
                                />
                                <p className="text-[0.8rem] text-muted-foreground">Leave 0 for unlimited usage</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expiry" className="text-sm font-medium">Expiry Date</Label>
                                <div className="relative">
                                    <Input
                                        id="expiry"
                                        type="date"
                                        value={newPromocode.expiryDate}
                                        onChange={(e) => setNewPromocode({ ...newPromocode, expiryDate: e.target.value })}
                                        className="pl-10 h-10"
                                    />
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-muted/10 mt-auto">
                            <SheetFooter className="flex-col sm:flex-row gap-3 sm:space-x-0">
                                <Button variant="outline" onClick={() => setIsPromocodeDialogOpen(false)} className="w-full sm:w-1/2">
                                    Cancel
                                </Button>
                                <Button onClick={handleCreatePromocode} className="w-full sm:w-1/2">
                                    Save Promocode
                                </Button>
                            </SheetFooter>
                        </div>
                    </SheetContent>
                </Sheet>
            </CardHeader>
            <CardContent>
                {promocodes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        No promocodes found. Create one to get started.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>COUPON#</TableHead>
                                <TableHead>COUPON CODE</TableHead>
                                <TableHead>TYPE</TableHead>
                                <TableHead>LIMIT</TableHead>
                                <TableHead>USED</TableHead>
                                <TableHead>VALUE</TableHead>
                                <TableHead>EXP. DATE</TableHead>
                                <TableHead className="text-right">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {promocodes.map((promo, index) => (
                                <TableRow key={promo._id}>
                                    <TableCell className="font-medium">#{index + 1}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono">
                                            {promo.code}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{promo.type}</TableCell>
                                    <TableCell>
                                        {promo.limit === 0 ? <Badge variant="secondary">Unlimited</Badge> : promo.limit}
                                    </TableCell>
                                    <TableCell>{promo.usageCount || 0}</TableCell>
                                    <TableCell>
                                        {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                                    </TableCell>
                                    <TableCell>
                                        {promo.expiryDate ? format(new Date(promo.expiryDate), "MMM dd, yyyy") : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                            onClick={() => handleDeletePromocode(promo._id)}
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
