"use client";

import { useState, useEffect, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Eye, Loader2, Send, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  contactId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  bookingId?: string;
  recurringGroupId?: string;
  bookingStartDateTime?: string;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
}

export default function InvoicesPage() {
  // Check permissions for this module
  const permissions = usePermissions("invoices");
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionLoadingType, setActionLoadingType] = useState<string | null>(null);
  const [deleteDialogInvoiceId, setDeleteDialogInvoiceId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false);
  const [company, setCompany] = useState<{ name?: string; logo?: string; email?: string; phone?: string } | null>(
    null
  );
  const invoicePreviewRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState({
    contactId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    items: [{ description: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 }],
    notes: "",
  });

  useEffect(() => {
    fetchInvoices();
    fetchContacts();
    fetchProducts();
    fetchCompany();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBooking() {
      if (!viewInvoice?.bookingId) {
        setViewBooking(null);
        return;
      }
      try {
        const res = await fetch(`/api/bookings/${viewInvoice.bookingId}`);
        if (!res.ok) throw new Error("Failed to fetch booking");
        const data = await res.json();
        if (!cancelled) setViewBooking(data);
      } catch {
        if (!cancelled) setViewBooking(null);
      }
    }
    loadBooking();
    return () => {
      cancelled = true;
    };
  }, [viewInvoice?.bookingId]);

  const fetchCompany = async () => {
    try {
      const response = await fetch("/api/company/settings", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCompany({
          name: data?.name,
          logo: data?.logo,
          email: data?.email,
          phone: data?.phone,
        });
      }
    } catch {
      // ignore
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/invoices");
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts");
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchInvoices();
        setIsSheetOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoadingId(id);
      setActionLoadingType("delete");
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Invoice deleted");
        fetchInvoices();
      } else {
        toast.error("Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    } finally {
      setActionLoadingId(null);
      setActionLoadingType(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      setActionLoadingId(id);
      setActionLoadingType(status);
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success("Invoice status updated");
        fetchInvoices();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update status");
    } finally {
      setActionLoadingId(null);
      setActionLoadingType(null);
    }
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      contactId: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      items: [{ description: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 }],
      notes: "",
    });
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      paid: "default",
      overdue: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const buildInvoicePdf = async (mode: "download" | "email" = "download") => {
    if (!viewInvoice || !invoicePreviewRef.current) return;
    let wrapper: HTMLDivElement | null = null;
    try {
      const [{ toPng, toJpeg }, { default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("html2canvas"),
        import("jspdf"),
      ]);
      // Render a clone off-screen at full height so PDF matches the invoice screenshot view.
      const source = invoicePreviewRef.current;
      const clone = source.cloneNode(true) as HTMLDivElement;
      wrapper = document.createElement("div");
      wrapper.classList.add("dark");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-99999px";
      wrapper.style.top = "0";
      wrapper.style.width = `${source.clientWidth}px`;
      wrapper.style.background = "#0b0b0b";
      wrapper.style.colorScheme = "dark";
      wrapper.style.padding = "0";
      wrapper.style.zIndex = "-1";
      clone.classList.add("dark");
      clone.style.maxHeight = "none";
      clone.style.height = "auto";
      clone.style.overflow = "visible";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const isEmailMode = mode === "email";
      let dataUrl: string;
      try {
        dataUrl = isEmailMode
          ? await toJpeg(clone, {
              pixelRatio: 1.25,
              quality: 0.82,
              cacheBust: true,
              backgroundColor: "#0b0b0b",
              canvasWidth: source.scrollWidth,
              canvasHeight: source.scrollHeight,
            })
          : await toPng(clone, {
              pixelRatio: 2,
              cacheBust: true,
              backgroundColor: "#0b0b0b",
              canvasWidth: source.scrollWidth,
              canvasHeight: source.scrollHeight,
            });
      } catch (renderError) {
        // Some browsers block reading cssRules from cross-origin stylesheets.
        // Fallback to html2canvas so invoice export still succeeds.
        const canvas = await html2canvas(clone, {
          backgroundColor: "#0b0b0b",
          scale: isEmailMode ? 1.25 : 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: source.scrollWidth,
          height: source.scrollHeight,
          windowWidth: source.scrollWidth,
          windowHeight: source.scrollHeight,
        });
        dataUrl = isEmailMode
          ? canvas.toDataURL("image/jpeg", 0.82)
          : canvas.toDataURL("image/png");
        console.warn("html-to-image failed, used html2canvas fallback:", renderError);
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      const imageType = isEmailMode ? "JPEG" : "PNG";
      pdf.addImage(dataUrl, imageType, 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, imageType, 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      return {
        pdf,
        fileName: `invoice-${viewInvoice.invoiceNumber}.pdf`,
      };
    } catch (error) {
      console.error("Failed to render styled invoice PDF:", error);
      throw error;
    } finally {
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!viewInvoice || !invoicePreviewRef.current) return;
    try {
      setDownloadingPdf(true);
      const result = await buildInvoicePdf("download");
      if (!result) return;
      result.pdf.save(result.fileName);
    } catch (error) {
      console.error("Failed to download invoice PDF:", error);
      toast.error("Failed to download styled invoice PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendInvoiceEmail = async () => {
    if (!viewInvoice || !invoicePreviewRef.current) return;
    try {
      setSendingInvoiceEmail(true);
      const result = await buildInvoicePdf("email");
      if (!result) return;

      const pdfDataUri = result.pdf.output("datauristring");
      const response = await fetch(`/api/invoices/${viewInvoice._id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: pdfDataUri,
          pdfFileName: result.fileName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to send invoice email");
      }

      toast.success("Invoice sent to client successfully");
      if (data?.invoice) {
        setViewInvoice(data.invoice);
      }
      fetchInvoices();
    } catch (error: any) {
      console.error("Failed to send invoice email:", error);
      toast.error(error?.message || "Failed to send invoice email");
    } finally {
      setSendingInvoiceEmail(false);
    }
  };

  const filteredInvoices =
    filterStatus === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage customer invoices
          </p>
        </div>
        {permissions.canCreate && (
          <Button
            onClick={() => {
              resetForm();
              setIsSheetOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        )}
      </div>

      {/* Create Invoice Sheet (replaces modal) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-4xl w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b gap-0">
            <SheetTitle>Create New Invoice</SheetTitle>
            <SheetDescription>Fill in the invoice details below</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="invoice-form" onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactId">Customer *</Label>
                    <Select
                      value={formData.contactId}
                      onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        {contacts.map((contact) => (
                          <SelectItem key={contact._id} value={contact._id}>
                            {contact.firstName +" "+ contact.lastName}
                            {contact.company && ` - ${contact.company}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line Items *</Label>
                    <Button type="button" size="sm" onClick={addLineItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded">
                        <div className="col-span-4">
                          <Label className="text-xs">Description</Label>
                          <Input
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(index, "quantity", parseInt(e.target.value))
                            }
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(index, "unitPrice", parseFloat(e.target.value))
                            }
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Tax %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateLineItem(index, "taxRate", parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-xs">Discount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) =>
                              updateLineItem(index, "discount", parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-span-1">
                          {formData.items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)} disabled={savingInvoice}>
              Cancel
            </Button>
            <Button type="submit" form="invoice-form" disabled={savingInvoice}>
              {savingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingInvoice ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="mt-4">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No invoices found. Create your first invoice to get started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice._id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {invoice.contactId?.firstName + " " + invoice.contactId?.lastName || "N/A"}
                            </div>
                            {invoice.contactId?.company && (
                              <div className="text-sm text-muted-foreground">
                                {invoice.contactId.company}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {permissions.canEdit && invoice.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewInvoice(invoice)}
                              >
                                Send
                              </Button>
                            )}
                            {permissions.canEdit && invoice.status === "sent" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(invoice._id, "paid")
                                }
                                disabled={actionLoadingId === invoice._id}
                              >
                                {actionLoadingId === invoice._id &&
                                  actionLoadingType === "paid" && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                Mark Paid
                              </Button>
                            )}
                            {permissions.canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteDialogInvoiceId(invoice._id)}
                                disabled={actionLoadingId === invoice._id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Invoice Sheet (right side) */}
      <Sheet
        open={!!viewInvoice}
        onOpenChange={(open) => {
          if (!open) {
            setViewInvoice(null);
            setViewBooking(null);
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b gap-0">
            <SheetTitle>Invoice Preview</SheetTitle>
            <SheetDescription>Review invoice details before sending or sharing.</SheetDescription>
          </SheetHeader>

          {viewInvoice && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div ref={invoicePreviewRef} className="rounded-2xl border bg-background shadow-sm overflow-hidden">
                <div className="p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Date{" "}
                      <span className="text-foreground font-medium">
                        {new Date(viewInvoice.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      Invoice{" "}
                      <span className="text-foreground font-medium">
                        #{viewInvoice.invoiceNumber}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs font-medium text-muted-foreground">To</div>
                      <div className="mt-2 text-sm">
                        <div className="font-semibold text-foreground">
                          {viewInvoice.contactId?.firstName + " " + viewInvoice.contactId?.lastName || "N/A"}
                        </div>
                        {viewInvoice.contactId?.company && (
                          <div className="text-muted-foreground">{viewInvoice.contactId.company}</div>
                        )}
                        {viewInvoice.contactId?.email && (
                          <div className="text-muted-foreground">{viewInvoice.contactId.email}</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs font-medium text-muted-foreground">From</div>
                      <div className="mt-2 text-sm">
                        <div className="font-semibold text-foreground">{company?.name || "Company"}</div>
                        <div className="text-muted-foreground">Billing</div>
                        <div className="text-muted-foreground">{company?.email || "support@company.com"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-full border bg-muted/20 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-destructive">
                        {formatCurrency(
                          (() => {
                            const items = viewInvoice.items || [];
                            const tax = Number(viewInvoice.taxAmount) || 0;
                            const discount = Math.abs(
                              items.reduce((sum, i) => {
                                const t = Number((i as any).total) || 0;
                                const desc = String((i as any).description || "").toLowerCase();
                                return sum + (t < 0 || desc.startsWith("discount") ? t : 0);
                              }, 0)
                            );
                            const grossSubtotal = items.reduce((sum, i) => {
                              const t = Number((i as any).total) || 0;
                              const desc = String((i as any).description || "").toLowerCase();
                              const isDiscount = t < 0 || desc.startsWith("discount");
                              return sum + (isDiscount ? 0 : Math.max(0, t));
                            }, 0);
                            const netSubtotal = Math.max(0, grossSubtotal - discount);
                            return Math.max(0, netSubtotal + tax);
                          })(),
                          viewInvoice.currency
                        )}
                      </span>{" "}
                      due on{" "}
                      <span className="text-foreground font-medium">
                        {new Date(viewInvoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: <span className="text-foreground font-medium">{viewInvoice.status}</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border bg-muted/10 overflow-hidden">
                    <div className="px-4 py-3 border-b bg-background/50">
                      <div className="text-sm font-semibold">Items</div>
                    </div>
                    <div className="p-0">
                      {(() => {
                        const items = viewInvoice.items || [];
                        const subServices = items.filter((i) => i.description?.startsWith("Sub Service:"));
                        const addons = items.filter((i) => i.description?.startsWith("Add On:"));
                        const discounts = items.filter((i) => {
                          const lineTotal = Number(i.total) || 0;
                          return lineTotal < 0 || String(i.description || "").toLowerCase().startsWith("discount");
                        });
                        const other = items.filter(
                          (i) =>
                            !i.description?.startsWith("Sub Service:") &&
                            !i.description?.startsWith("Add On:") &&
                            !(Number(i.total) < 0) &&
                            !String(i.description || "").toLowerCase().startsWith("discount")
                        );
                        const discountTotal = Math.abs(
                          discounts.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
                        );

                        const mainServiceName =
                          viewBooking?.serviceId?.name ||
                          (typeof viewBooking?.serviceId === "string" ? "Service" : "") ||
                          "Main service";

                        const renderGroup = (title: string, groupItems: any[], titleClass?: string) => {
                          if (!groupItems.length) return null;
                          return (
                            <>
                              <TableRow>
                                <TableCell colSpan={4} className={titleClass || "font-semibold"}>
                                  {title}
                                </TableCell>
                              </TableRow>
                              {groupItems.map((item, idx) => (
                                <TableRow key={`${title}-${idx}`}>
                                  <TableCell>
                                    <div className="font-medium text-foreground">
                                      {String(item.description || "")
                                        .replace(/^Sub Service:\s*/i, "")
                                        .replace(/^Add On:\s*/i, "")}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{item.quantity}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {formatCurrency(item.unitPrice, viewInvoice.currency)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(item.total, viewInvoice.currency)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        };

                        return (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[55%]">Service</TableHead>
                                <TableHead className="w-[15%]">Qty</TableHead>
                                <TableHead className="w-[15%]">Rate</TableHead>
                                <TableHead className="w-[15%] text-right">Line total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell colSpan={4} className="font-bold">
                                  {mainServiceName}
                                </TableCell>
                              </TableRow>
                              {renderGroup("Sub services", subServices, "pl-2 font-semibold text-primary")}
                              {renderGroup("Addons", addons, "pl-2 font-semibold text-primary")}
                              {renderGroup("Other", other, "pl-2 font-semibold text-primary")}
                              {discounts.length > 0 && (
                                <>
                                  <TableRow>
                                    <TableCell colSpan={4} className="pl-2 font-semibold text-primary">
                                      Discounts
                                    </TableCell>
                                  </TableRow>
                                  {discounts.map((item, idx) => (
                                    <TableRow key={`discount-${idx}`}>
                                      <TableCell>
                                        <div className="font-medium text-foreground">{item.description}</div>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">{item.quantity}</TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {formatCurrency(item.unitPrice, viewInvoice.currency)}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(item.total, viewInvoice.currency)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-right text-muted-foreground">
                                      Total discount
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      -{formatCurrency(discountTotal, viewInvoice.currency)}
                                    </TableCell>
                                  </TableRow>
                                </>
                              )}
                            </TableBody>
                          </Table>
                        );
                      })()}
                    </div>

                    <div className="px-4 py-4 border-t bg-background/50">
                      <div className="flex justify-end">
                        <div className="w-full sm:w-72 space-y-2 text-sm">
                          {(() => {
                            const items = viewInvoice.items || [];
                            const tax = Number(viewInvoice.taxAmount) || 0;
                            const discount = Math.abs(
                              items.reduce((sum, i) => {
                                const t = Number((i as any).total) || 0;
                                const desc = String((i as any).description || "").toLowerCase();
                                return sum + (t < 0 || desc.startsWith("discount") ? t : 0);
                              }, 0)
                            );
                            const grossSubtotal = items.reduce((sum, i) => {
                              const t = Number((i as any).total) || 0;
                              const desc = String((i as any).description || "").toLowerCase();
                              const isDiscount = t < 0 || desc.startsWith("discount");
                              return sum + (isDiscount ? 0 : Math.max(0, t));
                            }, 0);
                            const subtotal = Math.max(0, grossSubtotal - discount);
                            const total = Math.max(0, subtotal + tax);
                            return (
                              <>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Gross Subtotal</span>
                                  <span className="text-foreground">
                                    {formatCurrency(grossSubtotal, viewInvoice.currency)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Tax</span>
                                  <span className="text-foreground">
                                    {formatCurrency(tax, viewInvoice.currency)}
                                  </span>
                                </div>
                                {discount > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Total discount</span>
                                    <span className="text-foreground">
                                      -{formatCurrency(discount, viewInvoice.currency)}
                                    </span>
                                  </div>
                                )}
                                <div className="pt-2 border-t flex justify-between font-semibold">
                                  <span>Total</span>
                                  <span>{formatCurrency(total, viewInvoice.currency)}</span>
                                </div>
                                <div className="pt-2 flex justify-between text-xs text-muted-foreground">
                                  <span>Amount due</span>
                                  <span className="text-foreground font-medium">
                                    {formatCurrency(total, viewInvoice.currency)}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewInvoice.status !== "paid" ? (
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-sm font-semibold">Thank you for the business!</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Please pay within 15 days of receiving this invoice.
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-sm font-semibold">Payment received</div>
                        <div className="mt-1 text-xs text-muted-foreground">This invoice is marked as paid.</div>
                      </div>
                    )}
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-sm font-semibold">Bank details</div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="text-muted-foreground">Bank details</div>
                        <div className="text-foreground">ABCD BANK</div>
                        <div className="text-muted-foreground">IFSC code</div>
                        <div className="text-foreground">ABCD000XXXX</div>
                        <div className="text-muted-foreground">Swift code</div>
                        <div className="text-foreground">ABCDUSBBXXX</div>
                        <div className="text-muted-foreground">Account #</div>
                        <div className="text-foreground">37474892300011</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t bg-muted/10 px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {company?.logo ? (
                      <img
                        src={company.logo}
                        alt={company?.name || "Company logo"}
                        className="h-7 w-7 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        {(company?.name || "Company").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-sm font-semibold text-foreground">{company?.name || "Company"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    {company?.phone ? <span>{company.phone}</span> : <span>+0 (000) 123-4567</span>}
                    {company?.email ? <span>{company.email}</span> : <span>support@company.com</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewInvoice && (
            <SheetFooter className="p-4 border-t bg-muted/30 flex justify-end gap-2">
              {permissions.canEdit && viewInvoice.status === "draft" && (
                <Button
                  onClick={handleSendInvoiceEmail}
                  disabled={sendingInvoiceEmail || downloadingPdf}
                >
                  {sendingInvoiceEmail ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {sendingInvoiceEmail ? "Sending..." : "Send"}
                </Button>
              )}
              {permissions.canEdit && viewInvoice.status === "sent" && (
                <Button
                  onClick={async () => {
                    await handleStatusChange(viewInvoice._id, "paid");
                    setViewInvoice({ ...viewInvoice, status: "paid" });
                  }}
                >
                  Mark Paid
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloadingPdf ? "Generating..." : "Download"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Invoice Confirmation */}
      <Dialog
        open={!!deleteDialogInvoiceId}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogInvoiceId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogInvoiceId(null)}
              disabled={!!actionLoadingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteDialogInvoiceId || !!actionLoadingId}
              onClick={() => {
                if (deleteDialogInvoiceId) {
                  handleDelete(deleteDialogInvoiceId);
                }
              }}
            >
              {actionLoadingId === deleteDialogInvoiceId &&
                actionLoadingType === "delete" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
