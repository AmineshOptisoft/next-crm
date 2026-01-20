"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Keep Dialog for Filter
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  Filter,
  ChevronDown,
  ExternalLink,
  Users,
  UserX,
  Download,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";

interface ContactType {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  companyId?: string;
  status: string;
  bathrooms?: string;
  bedrooms?: string;
  specialInstructions?: string;
  zoneName?: string;
  fsrAssigned?: string;
  staxId?: string;
  lastAppointment?: string;
  nextAppointment?: string;
  createdAt: string;
  image?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [editingContact, setEditingContact] = useState<ContactType | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    status: "new lead",
    bathrooms: "",
    bedrooms: "",
    streetAddress: "",
    state: "",
    city: "",
    zipCode: "",
    specialInstructions: "",
    company: "",
    companyId: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Data
  const [filterData, setFilterData] = useState({
    name: "",
    email: "",
    status: "all",
    zone: "all",
    staxData: "all",
  });

  // Column Selection
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    email: true,
    zoneName: true,
    currentStage: true,
    fsrAssigned: true,
    lastAppointment: true,
    nextAppointment: true,
    joinOn: true,
    staxId: true,
    action: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchContacts();
    fetchCurrentUser();
  }, []);

  async function fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) { console.error(e); }
  }

  async function fetchContacts() {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      toast.error("Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  }

  // --- Image Handling ---

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileToUpload(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Upload failed", e);
    }
    return null;
  }

  // --- Form Handlers ---

  function handleEdit(contact: ContactType) {
    setEditingContact(contact);
    let fName = contact.firstName || "";
    let lName = contact.lastName || "";
    if (!fName && !lName && contact.name) {
      const parts = contact.name.split(" ");
      fName = parts[0];
      lName = parts.slice(1).join(" ");
    }

    setFormData({
      firstName: fName,
      lastName: lName,
      phone: contact.phone || "",
      email: contact.email || "",
      password: "",
      confirmPassword: "",
      status: contact.status || "new lead",
      bathrooms: contact.bathrooms || "",
      bedrooms: contact.bedrooms || "",
      streetAddress: contact.address?.street || "",
      state: contact.address?.state || "",
      city: contact.address?.city || "",
      zipCode: contact.address?.zipCode || "",
      specialInstructions: contact.specialInstructions || "",
      company: contact.company || "",
      companyId: contact.companyId || "",
    });
    setPreviewUrl(contact.image || null);
    setFileToUpload(null);
    setIsSheetOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContact && formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    let imageUrl = editingContact?.image || "";
    if (fileToUpload) {
      const uploaded = await uploadImage(fileToUpload);
      if (uploaded) imageUrl = uploaded;
      else toast.error("Image upload failed, continuing without new image");
    }

    const url = editingContact ? `/api/contacts/${editingContact._id}` : "/api/contacts";
    const method = editingContact ? "PUT" : "POST";

    const submitData: any = {
      ...formData,
      image: imageUrl
    };

    // Cleanup
    if (currentUser?.role !== "super_admin") delete submitData.companyId;
    delete submitData.confirmPassword;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        toast.success(editingContact ? "Updated successfully" : "Created successfully");
        await fetchContacts();
        setIsSheetOpen(false);
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.error || "Operation failed");
      }
    } catch (e) {
      toast.error("Operation failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      toast.success("Deleted successfully");
      fetchContacts();
    } catch (e) {
      toast.error("Failed to delete");
    }
  }

  function resetForm() {
    setEditingContact(null);
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      status: "new lead",
      bathrooms: "",
      bedrooms: "",
      streetAddress: "",
      state: "",
      city: "",
      zipCode: "",
      specialInstructions: "",
      company: "",
      companyId: "",
    });
    setFileToUpload(null);
    setPreviewUrl(null);
  }

  // --- Export CSV ---

  function exportCSV() {
    const headers = ["ID", "Name", "Email", "Phone", "Status", "Company", "Zone", "FSR", "Join Date"];
    const rows = filteredContacts.map((c, i) => [
      i + 1,
      c.name,
      c.email || "",
      c.phone || "",
      c.status,
      c.company || "",
      c.zoneName || "",
      c.fsrAssigned || "",
      c.createdAt ? format(new Date(c.createdAt), "yyyy-MM-dd") : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "contacts_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Filtering ---

  const filteredContacts = contacts.filter(contact => {
    if (filterData.name && !contact.name.toLowerCase().includes(filterData.name.toLowerCase())) return false;
    if (filterData.email && !contact.email?.toLowerCase().includes(filterData.email.toLowerCase())) return false;
    if (filterData.status !== "all" && contact.status !== filterData.status) return false;
    if (filterData.staxData === "stax" && !contact.staxId) return false;
    if (filterData.staxData === "non-stax" && contact.staxId) return false;
    return true;
  });

  const stats = {
    withStax: contacts.filter(c => c.staxId).length,
    withoutStax: contacts.filter(c => !c.staxId).length,
  };

  const currentItems = filteredContacts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const map: any = {
      lead: "bg-blue-100 text-blue-800",
      "new lead": "bg-gray-100 text-gray-800",
      prospect: "bg-yellow-100 text-yellow-800",
      customer: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
      maturing: "bg-purple-100 text-purple-800",
    };
    return <Badge className={map[status] || "bg-gray-100"} variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div><p className="text-sm font-medium text-muted-foreground">users_with_stax</p><h2 className="text-2xl font-bold">{stats.withStax}</h2></div>
            <Users className="h-8 w-8 text-primary opacity-75" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div><p className="text-sm font-medium text-muted-foreground">users_without_stax</p><h2 className="text-2xl font-bold">{stats.withoutStax}</h2></div>
            <UserX className="h-8 w-8 text-primary opacity-75" />
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Select Columns <ChevronDown className="ml-2 h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {Object.keys(visibleColumns).map((key) => (
              <DropdownMenuCheckboxItem key={key} checked={(visibleColumns as any)[key]} onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, [key]: checked })}>
                {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setIsSheetOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add New Client
          </Button>
          <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <div className="relative w-full md:w-64">
            <Input placeholder="Keywords..." value={filterData.name} onChange={e => setFilterData({ ...filterData, name: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.id && <TableHead>Id</TableHead>}
              {visibleColumns.name && <TableHead>NAME</TableHead>}
              {visibleColumns.email && <TableHead>EMAIL</TableHead>}
              {visibleColumns.zoneName && <TableHead>Zone Name</TableHead>}
              {visibleColumns.currentStage && <TableHead>CURRENT STAGE</TableHead>}
              {visibleColumns.fsrAssigned && <TableHead>FSR Assigned</TableHead>}
              {visibleColumns.lastAppointment && <TableHead>Last Appointment</TableHead>}
              {visibleColumns.nextAppointment && <TableHead>Next Appointment</TableHead>}
              {visibleColumns.joinOn && <TableHead>JOIN ON</TableHead>}
              {visibleColumns.staxId && <TableHead>STAX ID</TableHead>}
              {visibleColumns.action && <TableHead>ACTION</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={10} className="text-center py-4">Loading...</TableCell></TableRow> :
              currentItems.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-4">No records found</TableCell></TableRow> :
                currentItems.map((contact, idx) => (
                  <TableRow key={contact._id}>
                    {visibleColumns.id && <TableCell>{idx + 1 + (currentPage - 1) * 10}</TableCell>}
                    {/* Show Image if available with Name */}
                    {visibleColumns.name && <TableCell className="font-medium flex items-center gap-2">
                      {contact.image && <img src={contact.image} alt="" className="w-8 h-8 rounded-full object-cover" />}
                      {contact.name}
                    </TableCell>}
                    {visibleColumns.email && <TableCell>{contact.email}</TableCell>}
                    {visibleColumns.zoneName && <TableCell>{contact.zoneName || "-"}</TableCell>}
                    {visibleColumns.currentStage && <TableCell>{getStatusBadge(contact.status)}</TableCell>}
                    {visibleColumns.fsrAssigned && <TableCell>{contact.fsrAssigned || "-"}</TableCell>}
                    {visibleColumns.lastAppointment && <TableCell>{contact.lastAppointment ? format(new Date(contact.lastAppointment), 'MM-dd-yyyy') : "-"}</TableCell>}
                    {visibleColumns.nextAppointment && <TableCell>{contact.nextAppointment ? format(new Date(contact.nextAppointment), 'MM-dd-yyyy') : "-"}</TableCell>}
                    {visibleColumns.joinOn && <TableCell>{contact.createdAt ? format(new Date(contact.createdAt), 'yyyy-MM-dd HH:mm:ss') : "-"}</TableCell>}
                    {visibleColumns.staxId && <TableCell>{contact.staxId ? <a href="#" className="text-primary flex items-center hover:underline">Go to stax <ExternalLink className="w-3 h-3 ml-1" /></a> : "-"}</TableCell>}
                    {visibleColumns.action && <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => router.push(`/dashboard/contacts/${contact._id}`)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(contact._id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination (Simplified) */}
      <div className="flex items-center justify-between">
        <Badge variant="outline">{itemsPerPage} per page</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(c => Math.max(1, c - 1))}>Previous</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}>Next</Button>
        </div>
      </div>

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Filter Contacts</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Name</Label><Input value={filterData.name} onChange={e => setFilterData({ ...filterData, name: e.target.value })} placeholder="Name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={filterData.email} onChange={e => setFilterData({ ...filterData, email: e.target.value })} placeholder="Email" /></div>
            <div className="space-y-2"><Label>Customer Stage</Label>
              <Select value={filterData.status} onValueChange={v => setFilterData({ ...filterData, status: v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem><SelectItem value="new lead">New Lead</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem><SelectItem value="maturing">Maturing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFilterModalOpen(false)}>Apply Filter</Button>
            <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Form */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>
              {editingContact ? "Edit Contact" : "Create New Contact"}
            </SheetTitle>
            <SheetDescription>Enter contact details below.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload Section */}
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-32 h-32 bg-muted rounded-full overflow-hidden flex items-center justify-center border">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" /> Choose Image
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>

                {!editingContact && (
                  <>
                    <div className="space-y-2"><Label>Password</Label><Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} /></div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Customer Stage</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new lead">New Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="maturing">Maturing</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bathrooms</Label><Input value={formData.bathrooms} onChange={e => setFormData({ ...formData, bathrooms: e.target.value })} /></div>
                <div className="space-y-2"><Label>Bedrooms</Label><Input value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} /></div>
              </div>

              <div className="space-y-2"><Label>Street Address</Label><Input value={formData.streetAddress} onChange={e => setFormData({ ...formData, streetAddress: e.target.value })} /></div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>State</Label>
                  <Select value={formData.state} onValueChange={v => setFormData({ ...formData, state: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Alabama">Alabama</SelectItem><SelectItem value="California">California</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Zip Code</Label><Input value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} /></div>
              </div>

              <div className="space-y-2"><Label>Special instructions</Label><Input value={formData.specialInstructions} onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })} /></div>
            </form>
          </div>

          <SheetFooter className="p-4 border-t gap-2">
            <Button onClick={handleSubmit}>Save Changes</Button>
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
