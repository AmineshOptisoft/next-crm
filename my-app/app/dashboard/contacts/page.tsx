"use client";

import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ContactType {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  companyId?: string; // CRM company ID
  status: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactType | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "lead",
    companyId: "", // For super admin to select company
  });

  useEffect(() => {
    fetchContacts();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    // Fetch companies if user is super admin
    if (currentUser?.role === "super_admin") {
      fetchCompanies();
    }
  }, [currentUser]);

  async function fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user); // Extract user from response
      }
    } catch (e) {
      console.error("Error fetching current user:", e);
    }
  }

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error("Error fetching companies:", e);
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      } else {
        // Safely parse error response
        let errorMessage = "Failed to fetch contacts";
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          errorMessage = res.statusText || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error("Error fetching contacts:", e);
      toast.error("Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const url = editingContact
      ? `/api/contacts/${editingContact._id}`
      : "/api/contacts";
    const method = editingContact ? "PUT" : "POST";

    // Prepare data - add companyId for super admin
    const submitData: any = { ...formData };
    if (currentUser?.role === "super_admin" && formData.companyId) {
      submitData.companyId = formData.companyId;
    }
    // Remove the companyId field from formData for regular users
    if (currentUser?.role !== "super_admin") {
      delete submitData.companyId;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        toast.success(
          editingContact
            ? "Contact updated successfully"
            : "Contact created successfully"
        );
        await fetchContacts();
        setIsDialogOpen(false);
        resetForm();
      } else {
        // Safely parse error response
        let errorMessage = "Failed to save contact";
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = res.statusText || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error("Error saving contact:", e);
      toast.error("Failed to save contact");
    }
  }

  async function handleDelete(id: string) {
    toast.promise(
      fetch(`/api/contacts/${id}`, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to delete contact");
        }
        await fetchContacts();
        return res;
      }),
      {
        loading: "Deleting contact...",
        success: "Contact deleted successfully",
        error: (err) => err.message || "Failed to delete contact",
      }
    );
  }

  function handleEdit(contact: ContactType) {
    setEditingContact(contact);
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      status: contact.status || "lead",
      companyId: contact.companyId || "", // Populate companyId for editing
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setEditingContact(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "lead",
      companyId: "",
    });
  }

  function getStatusBadge(status: string) {
    const variants: Record<
      string,
      "default" | "secondary" | "outline" | "destructive"
    > = {
      lead: "outline",
      prospect: "secondary",
      customer: "default",
      inactive: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your leads and customers
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </DialogTitle>
              <DialogDescription>
                Fill in the contact information below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                
                {/* When creating: Add CRM Company selector and Contact's Company field */}
                {!editingContact && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {/* CRM Company selector for super admin, display for regular users */}
                      {currentUser?.role === "super_admin" ? (
                        <>
                          <Label htmlFor="companyId">CRM Company *</Label>
                          <Select
                            value={formData.companyId}
                            onValueChange={(value) =>
                              setFormData({ ...formData, companyId: value })
                            }
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select CRM company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map((company) => (
                                <SelectItem key={company._id} value={company._id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : currentUser?.companyId ? (
                        <>
                          <Label>CRM Company</Label>
                          <Input
                            value={currentUser.companyId.name || "Your Company"}
                            disabled
                            className="bg-muted"
                          />
                        </>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Contact's Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        placeholder="e.g., Acme Corp"
                      />
                    </div>
                  </div>
                )}
                
                {/* When editing: Show CRM company (if super admin) and contact's company */}
                {editingContact && (
                  <>
                    {currentUser?.role === "super_admin" && (
                      <div className="space-y-2">
                        <Label htmlFor="companyId">CRM Company *</Label>
                        <Select
                          value={formData.companyId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, companyId: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select CRM company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company._id} value={company._id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="company">Contact's Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        placeholder="e.g., Acme Corp"
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Button type="submit">
                  {editingContact ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No contacts found. Add your first contact to get started.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.email || "-"}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.company || "-"}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c._id)}
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
    </div>
  );
}
