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
import { Separator } from "@/components/ui/separator";
import {
    Plus,
    Trash2,
    RefreshCw,
    FileText,
    Loader2,
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
import { cn } from "@/lib/utils";

interface BillClientModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookingId: string;
}

interface InvoiceItem {
    kind: "sub" | "addon" | "custom";
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

type CustomDiscountLine = {
    id: string;
    name: string;
    amount: string;
};

export function BillClientModal({
    open,
    onOpenChange,
    bookingId,
}: BillClientModalProps) {
    const getPromoCodeText = (src: any): string => {
        const raw = src?.promocode ?? src?.promoCode ?? src?.promo;
        if (!raw) return "";
        if (typeof raw === "string") return raw.trim();
        if (typeof raw === "object") {
            const fromCode = typeof raw.code === "string" ? raw.code.trim() : "";
            if (fromCode) return fromCode;
            const fromName = typeof raw.name === "string" ? raw.name.trim() : "";
            if (fromName) return fromName;
        }
        return "";
    };

    const getPromoDiscountAmount = (src: any): number => {
        const promo = src?.promocode ?? src?.promoCode ?? src?.promo;
        if (promo && typeof promo === "object") {
            const promoDisc = Number(promo.discountAmount);
            if (Number.isFinite(promoDisc) && promoDisc > 0) return promoDisc;
        }
        return Number(src?.pricing?.discount) || 0;
    };

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);

    // Invoice Items State
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [includeBookingDiscount, setIncludeBookingDiscount] = useState(true);
    const [customDiscounts, setCustomDiscounts] = useState<CustomDiscountLine[]>([]);
    const bookingDurationHours = useMemo(() => {
        const start = booking?.startDateTime ? new Date(booking.startDateTime).getTime() : NaN;
        const end = booking?.endDateTime ? new Date(booking.endDateTime).getTime() : NaN;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
        return (end - start) / 3_600_000;
    }, [booking?.startDateTime, booking?.endDateTime]);

    useEffect(() => {
        if (open && bookingId) {
            fetchData();
        }
    }, [open, bookingId]);

    // Base price should be charged once per service line (not per unit).
    // We expose an effective unit price for display/editing by distributing base across qty.
    const calculateEffectiveUnitPrice = (service: any, qty: number): number => {
        const B = Number(service?.basePrice) || 0;
        const H = Number(service?.hourlyRate) || 0;
        const R = Number(service?.percentage ?? service?.rangePercentage) || 0;
        const minutes = Number(service?.estimatedTime) || 0;
        const hoursPerUnit = minutes > 0 ? minutes / 60 : bookingDurationHours;
        const q = Math.max(1, Number(qty) || 1);
        // base counted once, labor scales by qty; distribute base across units for unit display
        const unitSubtotal = (B / q) + H * hoursPerUnit;
        return unitSubtotal * (1 + R / 100);
    };

    const fetchData = async () => {
        try {
            setFetching(true);
            const bookingRes = await fetch(`/api/bookings/${bookingId}`).then((res) => res.json());
            setBooking(bookingRes);

            const query = bookingRes?.recurringGroupId && bookingRes?.startDateTime
                ? `recurringGroupId=${encodeURIComponent(bookingRes.recurringGroupId)}&bookingStartDateTime=${encodeURIComponent(bookingRes.startDateTime)}`
                : `bookingId=${encodeURIComponent(bookingId)}`;

            const invoicesRes = await fetch(`/api/invoices?${query}`).then((res) => res.json());
            let nextInvoices = Array.isArray(invoicesRes) ? invoicesRes : [];
            // Backwards compatibility: older invoices may have been stored by bookingId even for grouped bookings
            if (nextInvoices.length === 0 && bookingRes?.recurringGroupId) {
                const legacy = await fetch(`/api/invoices?bookingId=${encodeURIComponent(bookingId)}`).then((res) => res.json());
                nextInvoices = Array.isArray(legacy) ? legacy : [];
            }
            setInvoices(nextInvoices);

            if (bookingRes && items.length === 0) {
                const nextItems: InvoiceItem[] = [];

                // Sub services
                (bookingRes.subServices || []).forEach((s: any) => {
                    const qty = Number(s?.quantity) || 0;
                    if (qty <= 0) return;
                    const svc = s?.serviceId;
                    const unit = calculateEffectiveUnitPrice(svc, qty);
                    nextItems.push({
                        kind: "sub",
                        description: svc?.name || "Sub Service",
                        quantity: qty,
                        unitPrice: unit,
                        total: qty * unit,
                    });
                });

                // Addons
                (bookingRes.addons || []).forEach((a: any) => {
                    const qty = Number(a?.quantity) || 0;
                    if (qty <= 0) return;
                    const svc = a?.serviceId;
                    const unit = calculateEffectiveUnitPrice(svc, qty);
                    nextItems.push({
                        kind: "addon",
                        description: svc?.name || "Addon",
                        quantity: qty,
                        unitPrice: unit,
                        total: qty * unit,
                    });
                });

                setItems(nextItems);
            }

            // Discount UI defaults (promocode only — don't show "booking discount" without a code)
            const bookingPromo = getPromoCodeText(bookingRes);
            setIncludeBookingDiscount(Boolean(bookingPromo));
            setCustomDiscounts([]);
        } catch (error) {
            console.error("Failed to fetch billing data", error);
        } finally {
            setFetching(false);
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            { kind: "custom", description: "", quantity: 1, unitPrice: 0, total: 0 },
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
        const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const bookingDisc = includeBookingDiscount ? (Number(booking?.pricing?.discount) || 0) : 0;
        const customDisc = customDiscounts.reduce((sum, d) => sum + Math.max(0, Number(d.amount) || 0), 0);
        return Math.max(0, subtotal - bookingDisc - customDisc);
    }, [items, booking, includeBookingDiscount, customDiscounts]);

    const subtotalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    }, [items]);

    const bookingPromoCode = useMemo(() => {
        return getPromoCodeText(booking);
    }, [booking]);

    const bookingDiscountAmount = useMemo(() => {
        return getPromoDiscountAmount(booking);
    }, [booking]);

    const totalDiscountAmount = useMemo(() => {
        const bookingDisc = includeBookingDiscount ? bookingDiscountAmount : 0;
        const customDisc = customDiscounts.reduce((sum, d) => sum + Math.max(0, Number(d.amount) || 0), 0);
        return bookingDisc + customDisc;
    }, [includeBookingDiscount, bookingDiscountAmount, customDiscounts]);

    const handleCreateInvoice = async () => {
        try {
            setLoading(true);
            const isGroupInvoice = !!booking?.recurringGroupId && !!booking?.startDateTime;
            const invoiceItems: any[] = [
                ...items.map(it => ({
                    description:
                        it.kind === "sub"
                            ? `Sub Service: ${it.description}`
                            : it.kind === "addon"
                                ? `Add On: ${it.description}`
                                : it.description,
                    quantity: Number(it.quantity) || 0,
                    unitPrice: Number(it.unitPrice) || 0,
                    taxRate: 0,
                    discount: 0
                })),
            ];

            // Promocode discount (optional)
            if (includeBookingDiscount && bookingPromoCode && bookingDiscountAmount > 0) {
                invoiceItems.push({
                    description: `Discount (${bookingPromoCode})`,
                    quantity: 1,
                    unitPrice: -Math.min(bookingDiscountAmount, subtotalAmount),
                    taxRate: 0,
                    discount: 0,
                });
            }

            // Multiple custom discounts
            for (const d of customDiscounts) {
                const amt = Math.max(0, Number(d.amount) || 0);
                if (amt <= 0) continue;
                invoiceItems.push({
                    description: d.name?.trim() ? `Discount (${d.name.trim()})` : "Discount",
                    quantity: 1,
                    unitPrice: -Math.min(amt, subtotalAmount),
                    taxRate: 0,
                    discount: 0,
                });
            }

            const payload = {
                bookingId: isGroupInvoice ? undefined : bookingId,
                recurringGroupId: isGroupInvoice ? booking.recurringGroupId : undefined,
                bookingStartDateTime: isGroupInvoice ? booking.startDateTime : undefined,
                contactId: booking?.contactId?._id || booking?.contactId,
                items: invoiceItems,
                issueDate: new Date().toISOString().split("T")[0],
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            };

            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let message = "Failed to create invoice";
                try {
                    const err = await res.json();
                    if (err?.error) message = err.error;
                    else if (err?.message) message = err.message;
                } catch {
                    // ignore parse errors and fallback to default message
                }
                throw new Error(message);
            }

            toast.success("Invoice created successfully");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
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
                                    <TableRow >
                                        <TableHead className="w-[45%]">Details</TableHead>
                                        <TableHead className="">Qty</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Main service header (no price) */}
                                    <TableRow className="border-none">
                                        <TableCell colSpan={5} className="py-2 px-1 md:px-4 font-bold">
                                            {booking?.serviceId?.name || "Main service"}
                                        </TableCell>
                                    </TableRow>

                                    {/* Sub services */}
                                    {items
                                        .map((it, idx) => ({ it, idx }))
                                        .filter(({ it }) => it.kind === "sub")
                                        .map(({ it: item, idx }) => (
                                            <TableRow key={idx} className="border-none hover:bg-transparent">
                                                <TableCell className="py-2 px-1 md:px-4">
                                                    <div className="pl-6 text-xs md:text-sm font-medium">
                                                        Sub service:{" "}
                                                        <Input
                                                            className="inline-flex w-[70%] bg-background text-xs md:text-sm ml-2"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                                                            placeholder="Sub service name"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-1">
                                                    <Input
                                                        type="number"
                                                        className="text-center bg-background w-14 md:w-20 text-xs md:text-sm"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                                    />
                                                </TableCell>
                                                
                                                <TableCell className="text-right font-bold py-2 text-xs md:text-sm">
                                                    ${Number(item.total || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-2 px-1">
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                    {/* Addons */}
                                    {items
                                        .map((it, idx) => ({ it, idx }))
                                        .filter(({ it }) => it.kind === "addon")
                                        .map(({ it: item, idx }) => (
                                            <TableRow key={idx} className="border-none hover:bg-transparent">
                                                <TableCell className="py-2 px-1 md:px-4">
                                                    <div className="pl-6 text-xs md:text-sm font-medium">
                                                        Add ons:{" "}
                                                        <Input
                                                            className="inline-flex w-[70%] bg-background text-xs md:text-sm ml-2"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                                                            placeholder="Addon name"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-1">
                                                    <Input
                                                        type="number"
                                                        className="text-center bg-background w-14 md:w-20 text-xs md:text-sm"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                                    />
                                                </TableCell>
                                                
                                                <TableCell className="text-right font-bold py-2 text-xs md:text-sm">
                                                    ${Number(item.total || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-2 px-1">
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                    {/* Custom line items (optional) */}
                                    {items
                                        .map((it, idx) => ({ it, idx }))
                                        .filter(({ it }) => it.kind === "custom")
                                        .map(({ it: item, idx }) => (
                                            <TableRow key={idx} className="border-none hover:bg-transparent">
                                                <TableCell className="py-2 px-1 md:px-4">
                                                    <div className="text-xs md:text-sm font-medium">
                                                        Custom:{" "}
                                                        <Input
                                                            className="inline-flex w-[70%] bg-background text-xs md:text-sm ml-2"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                                                            placeholder="Item description"
                                                        />
                                                    </div>
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
                                                    ${Number(item.total || 0).toFixed(2)}
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

                        {/* Discount section */}
                        <div className="border rounded-lg bg-background p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-bold">Discount</div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        setCustomDiscounts((prev) => [
                                            ...prev,
                                            {
                                                id: typeof crypto !== "undefined" && "randomUUID" in crypto ? (crypto as any).randomUUID() : String(Date.now()),
                                                name: "",
                                                amount: "0",
                                            },
                                        ]);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Discount
                                </Button>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_56px] bg-muted px-3 py-2 text-[10px] font-bold uppercase">
                                    <div>Promocode</div>
                                    <div className="text-right">Amount/%</div>
                                    <div className="text-right">Deducted</div>
                                    <div></div>
                                </div>

                                {/* Promocode discount row */}
                                {bookingPromoCode && includeBookingDiscount && (
                                    <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_56px] items-center px-3 py-2 text-xs">
                                        <div className="font-medium truncate">{bookingPromoCode}</div>
                                        <div className="text-right text-muted-foreground">-</div>
                                        <div className="text-right font-semibold">
                                            -${Math.min(bookingDiscountAmount, subtotalAmount).toFixed(2)}
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setIncludeBookingDiscount(false)}
                                                title="Remove discount"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Custom discount rows (multiple) */}
                                {customDiscounts.map((d) => (
                                    <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_140px_140px_56px] items-center px-3 py-2 text-xs">
                                        <div className="min-w-0">
                                            <Input
                                                value={d.name}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setCustomDiscounts((prev) =>
                                                        prev.map((x) => (x.id === d.id ? { ...x, name: v } : x))
                                                    );
                                                }}
                                                placeholder="Discount name"
                                                className="h-8 bg-background"
                                            />
                                        </div>
                                        <div className="text-right">
                                            <Input
                                                type="number"
                                                value={d.amount}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setCustomDiscounts((prev) =>
                                                        prev.map((x) => (x.id === d.id ? { ...x, amount: v } : x))
                                                    );
                                                }}
                                                className="h-8 text-right bg-background"
                                            />
                                        </div>
                                        <div className="text-right font-semibold">
                                            -${Math.min(Math.max(0, Number(d.amount) || 0), subtotalAmount).toFixed(2)}
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setCustomDiscounts((prev) => prev.filter((x) => x.id !== d.id))}
                                                title="Remove discount"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty state */}
                                {(!includeBookingDiscount && customDiscounts.length === 0) && (
                                    <div className="px-3 py-3 text-xs text-muted-foreground">
                                        No discount applied.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Subtotal</div>
                                <Input readOnly value={`$${subtotalAmount.toFixed(2)}`} className="bg-muted font-bold" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Discount</div>
                                <Input readOnly value={`-$${Math.min(totalDiscountAmount, subtotalAmount).toFixed(2)}`} className="bg-muted font-bold" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Total</div>
                                <Input readOnly value={`$${totalAmount.toFixed(2)}`} className="bg-muted font-bold" />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                className="px-6 md:px-8 h-10 font-bold"
                                onClick={handleCreateInvoice}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
