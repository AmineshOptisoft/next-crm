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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  contactId: {
    _id: string;
    name: string;
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
}

interface Contact {
  _id: string;
  name: string;
  email?: string;
  company?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
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
  }, []);

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
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchInvoices();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Fill in the invoice details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="contactId">Customer *</Label>
                    <Select
                      value={formData.contactId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contactId: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        {contacts.map((contact) => (
                          <SelectItem key={contact._id} value={contact._id}>
                            {contact.name}
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
                      onChange={(e) =>
                        setFormData({ ...formData, issueDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
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
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-end p-3 border rounded"
                      >
                        <div className="col-span-4">
                          <Label className="text-xs">Description</Label>
                          <Input
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(index, "description", e.target.value)
                            }
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
                              updateLineItem(
                                index,
                                "quantity",
                                parseInt(e.target.value)
                              )
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
                              updateLineItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value)
                              )
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
                              updateLineItem(
                                index,
                                "taxRate",
                                parseFloat(e.target.value)
                              )
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
                              updateLineItem(
                                index,
                                "discount",
                                parseFloat(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div className="col-span-1">
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Invoice</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                              {invoice.contactId.name}
                            </div>
                            {invoice.contactId.company && (
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
                            {invoice.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(invoice._id, "sent")
                                }
                              >
                                Send
                              </Button>
                            )}
                            {invoice.status === "sent" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(invoice._id, "paid")
                                }
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(invoice._id)}
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
          )}
        </TabsContent>
      </Tabs>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Customer</h3>
                  <p>{viewInvoice.contactId.name}</p>
                  {viewInvoice.contactId.company && (
                    <p className="text-sm text-muted-foreground">
                      {viewInvoice.contactId.company}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Dates</h3>
                  <p className="text-sm">
                    Issue: {new Date(viewInvoice.issueDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    Due: {new Date(viewInvoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          {formatCurrency(item.unitPrice, viewInvoice.currency)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.total, viewInvoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-end space-y-1">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>
                        {formatCurrency(viewInvoice.subtotal, viewInvoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>
                        {formatCurrency(viewInvoice.taxAmount, viewInvoice.currency)}
                      </span>
                    </div>
                    {viewInvoice.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>
                          -
                          {formatCurrency(
                            viewInvoice.discountAmount,
                            viewInvoice.currency
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-1">
                      <span>Total:</span>
                      <span>
                        {formatCurrency(viewInvoice.total, viewInvoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
