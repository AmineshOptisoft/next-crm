"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Plus,
    Trash2,
    RefreshCw,
    FileText,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BillClientModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookingId: string;
}

interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export function BillClientModal({
    open,
    onOpenChange,
    bookingId,
}: BillClientModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);

    // Invoice Items State
    const [items, setItems] = useState<InvoiceItem[]>([]);

    useEffect(() => {
        if (open && bookingId) {
            fetchData();
        }
    }, [open, bookingId]);

    const fetchData = async () => {
        try {
            setFetching(true);
            const [bookingRes, invoicesRes] = await Promise.all([
                fetch(`/api/bookings/${bookingId}`).then((res) => res.json()),
                fetch(`/api/invoices?bookingId=${bookingId}`).then((res) => res.json()),
            ]);

            setBooking(bookingRes);
            setInvoices(Array.isArray(invoicesRes) ? invoicesRes : []);

            if (bookingRes && items.length === 0) {
                setItems([
                    {
                        description: bookingRes.serviceId?.name || "Service Fee",
                        quantity: 1,
                        unitPrice: bookingRes.pricing?.finalAmount || 0,
                        total: bookingRes.pricing?.finalAmount || 0,
                    },
                ]);
            }
        } catch (error) {
            console.error("Failed to fetch billing data", error);
        } finally {
            setFetching(false);
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            { description: "", quantity: 1, unitPrice: 0, total: 0 },
        ]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        if (field === "quantity" || field === "unitPrice") {
            item.total = Number(item.quantity) * Number(item.unitPrice);
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.total || 0), 0);
    }, [items]);

    const handleCreateInvoice = async () => {
        try {
            setLoading(true);
            const payload = {
                bookingId,
                contactId: booking?.contactId?._id || booking?.contactId,
                items: items.map(it => ({
                    description: it.description,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    total: it.total
                })),
                subtotal: totalAmount,
                total: totalAmount,
                status: "sent",
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            };

            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to create invoice");

            toast.success("Invoice created successfully");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
                <SheetHeader className="p-4 border-b gap-0">
                    <SheetTitle className="text-xl font-bold">Card Details</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* Top Info Bar */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <span className="text-muted-foreground font-medium">Lillypad Stax Id:</span>
                            <span className="ml-2 text-primary font-bold">{booking?.contactId?.staxId || "N/A"}</span>
                        </div>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add Card
                        </Button>
                    </div>

                    <Separator />

                    {/* Stax / Customer Summary */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">Stax data</span>
                        </div>

                        <div className="grid grid-cols-[180px_10px_1fr] md:grid-cols-[220px_10px_1fr] gap-y-2 text-xs md:text-sm text-foreground">
                            {[
                                { label: "Name", value: `${booking?.contactId?.firstName || ""} ${booking?.contactId?.lastName || ""}` },
                                { label: "Email", value: booking?.contactId?.email, className: "text-primary break-all" },
                                { label: "Phone", value: booking?.contactId?.phoneNumber },
                                { label: "Address", value: `${booking?.shippingAddress?.city || ""}, ${booking?.shippingAddress?.state || ""}, ${booking?.shippingAddress?.zipCode || ""}` },
                                { label: "Price", value: `$${booking?.pricing?.finalAmount || "0"}` },
                                { label: "Booking Discount Price", value: `$${booking?.pricing?.discount ? (booking.pricing.discount).toFixed(2) : "0.00"}` },
                                { label: "Booking Discount", value: `$${booking?.pricing?.discount || "0"}` },
                                { label: "Billing Notes", value: booking?.notes },
                                { label: "Notes", value: booking?.notes },
                                { label: "Team Cleaning Time", value: "0 hours 0 min" },
                                { label: "Applicable Discount", value: "" },
                                { label: "Technician Time", value: "" },
                                { label: "Timesheet Notes", value: "" },
                            ].map((row, idx) => (
                                <React.Fragment key={idx}>
                                    <div className="text-muted-foreground font-medium capitalize">{row.label}</div>
                                    <div className="text-muted-foreground">:</div>
                                    <div className={cn("font-medium", row.className)}>{row.value || "-"}</div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Invoice Builder Section */}
                    <div className="border rounded-xl p-4 md:p-6 bg-muted/30 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl md:text-2xl font-bold">Invoice</h3>
                            <Button variant="secondary" size="sm" onClick={addItem}>
                                <Plus className="h-4 w-4 mr-1" /> Add More
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted text-[10px] font-bold uppercase">
                                    <TableRow>
                                        <TableHead className="w-[45%]">Details</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-center">Price</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, idx) => (
                                        <TableRow key={idx} className="border-none hover:bg-transparent">
                                            <TableCell className="py-2 px-1 md:px-4">
                                                <Select
                                                    value={item.description}
                                                    onValueChange={(val) => updateItem(idx, "description", val)}
                                                >
                                                    <SelectTrigger className="bg-background text-xs md:text-sm">
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="First Time Cleaning">First Time Cleaning</SelectItem>
                                                        <SelectItem value="Base Fee">Base Fee</SelectItem>
                                                        <SelectItem value="Custom">Custom Item</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="py-2 px-1">
                                                <Input
                                                    type="number"
                                                    className="text-center bg-background w-14 md:w-20 text-xs md:text-sm"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="py-2 px-1">
                                                <Input
                                                    type="number"
                                                    className="text-center bg-background w-16 md:w-24 text-xs md:text-sm"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-bold py-2 text-xs md:text-sm">
                                                ${item.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-2 px-1">
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-4 flex-1">
                                <span className="font-bold">Total :</span>
                                <Input readOnly value={`$${totalAmount.toFixed(2)}`} className="max-w-[150px] font-bold bg-muted" />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                className="px-6 md:px-8 h-10 font-bold"
                                onClick={handleCreateInvoice}
                                disabled={loading}
                            >
                                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                Create Invoice
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Send Area */}
                    <div className="flex flex-col gap-4">
                        <div className="font-bold text-xs uppercase text-muted-foreground tracking-wider">
                            Send Invoice to user 1
                        </div>

                        <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={fetchData}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh Invoice List
                            </Button>
                        </div>
                    </div>

                    {/* Invoice List Table */}
                    <div className="space-y-4">
                        <h3 className="text-2xl md:text-3xl font-bold">Invoice List</h3>
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted text-[10px] font-bold uppercase">
                                    <TableRow>
                                        <TableHead className="px-2">Id</TableHead>
                                        <TableHead className="px-2">Inv Num</TableHead>
                                        <TableHead className="px-2">Date</TableHead>
                                        <TableHead className="px-2">Amount</TableHead>
                                        <TableHead className="px-2">Status</TableHead>
                                        <TableHead className="text-right px-2">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No records found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((inv, i) => (
                                            <TableRow key={inv._id}>
                                                <TableCell className="px-2 text-xs">{i + 1}</TableCell>
                                                <TableCell className="px-2 text-xs">{inv.invoiceNumber}</TableCell>
                                                <TableCell className="px-2 text-xs whitespace-nowrap">{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                                                <TableCell className="px-2 text-xs font-medium">${inv.total}</TableCell>
                                                <TableCell className="px-2">
                                                    <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className="uppercase text-[9px] px-1 md:text-[10px]">
                                                        {inv.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right px-2">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <FileText className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <SheetFooter className="mt-auto p-4 border-t bg-muted/30 flex flex-row justify-end">
                    <Button variant="default" className="w-fit" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>

    );
}
