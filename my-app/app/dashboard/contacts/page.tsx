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
  Image as ImageIcon,
  Building2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";
import { ServiceDefaults } from "./[id]/ServiceDefaults";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface ContactType {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  companyName?: string;
  companyId?: string;
  contactStatus: string;
  bathrooms?: string;
  bedrooms?: string;
  specialInstructions?: string;
  zoneName?: string;
  fsrAssigned?: string;
  staxId?: string;
  lastAppointment?: string;
  nextAppointment?: string;
  createdAt: string;
  avatarUrl?: string;
  address?: string;
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
    serviceDefaults: {},
    zoneName: "",
    fsrAssigned: "",
    role: "contact"
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Data
  const [filterData, setFilterData] = useState({
    name: "",
    email: "",
    status: "all",
    zone: "all",
    staxData: "all",
    lastAppointmentFrom: "",
    lastAppointmentTo: "",
    nextAppointmentFrom: "",
    nextAppointmentTo: "",
    notHaveBookingFrom: "none",
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
  const [statesList, setStatesList] = useState<any[]>([]);
  const [zonesList, setZonesList] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetchContacts();
    fetchCurrentUser();
    fetchStates();
    fetchZones();
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }

  async function fetchZones() {
    try {
      const res = await fetch("/api/zip-codes");
      if (res.ok) {
        const data = await res.json();
        const uniqueZones = Array.from(new Set(data.map((z: any) => z.zone))) as string[];
        setZonesList(uniqueZones);
      }
    } catch (e) {
      console.error("Failed to fetch zones", e);
    }
  }

  async function fetchStates() {
    try {
      const res = await fetch("/api/geo/states?countryId=US");
      if (res.ok) {
        const data = await res.json();
        setStatesList(data);
      }
    } catch (e) {
      console.error("Failed to fetch states", e);
    }
  }

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
      const res = await fetch("/api/upload?subfolder=contacts", {
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

    setFormData({
      firstName: fName,
      lastName: lName,
      phone: contact.phoneNumber || "",
      email: contact.email || "",
      password: "",
      confirmPassword: "",
      status: contact.contactStatus || "new lead",
      bathrooms: contact.bathrooms || "",
      bedrooms: contact.bedrooms || "",
      streetAddress: contact.address || "",
      state: "", // User model has string address, individual components might be missing or combined
      city: "",
      zipCode: "",
      specialInstructions: contact.specialInstructions || "",
      company: contact.companyName || "",
      companyId: contact.companyId || "",
      serviceDefaults: (contact as any).serviceDefaults || {},
      zoneName: contact.zoneName || "",
      fsrAssigned: contact.fsrAssigned || "",
      role: contact?.role || "contact"
    });
    setPreviewUrl(contact.avatarUrl || null);
    setFileToUpload(null);
    setIsSheetOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContact && formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    let imageUrl = editingContact?.avatarUrl || "";
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
      serviceDefaults: {},
      zoneName: "",
      fsrAssigned: "",
      role: "contact"
    });
    setFileToUpload(null);
    setPreviewUrl(null);
  }
  const handleRemoveLogo = () => {
    fileToUpload && setFileToUpload(null);
    previewUrl && setPreviewUrl(null);
  };
  // --- Export CSV ---

  const filteredContacts = contacts.filter(contact => {
    // Search by Name or Email (Keywords input)
    if (filterData.name) {
      const search = filterData.name.toLowerCase();
      const nameMatch = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(search);
      const emailMatch = contact.email?.toLowerCase()?.includes(search);
      if (!nameMatch && !emailMatch) return false;
    }

    // Email Filter (if specifically entered in filter modal)
    if (filterData.email && !contact.email?.toLowerCase()?.includes(filterData.email.toLowerCase())) return false;

    // Status Filter
    if (filterData.status !== "all" && contact.contactStatus !== filterData.status) return false;

    // Zone Filter
    if (filterData.zone !== "all" && contact.zoneName !== filterData.zone) return false;

    // Stax Filter
    if (filterData.staxData === "stax" && !contact.staxId) return false;
    if (filterData.staxData === "non-stax" && contact.staxId) return false;

    return true;
  });

  // Refreshing CSV export to use updated field names
  function exportCSV() {
    const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Status", "Company", "Zone", "FSR", "Join Date"];
    const rows = filteredContacts.map((c, i) => [
      i + 1,
      c.firstName,
      c.lastName,
      c.email || "",
      c.phoneNumber || "",
      c.contactStatus,
      c.companyName || "",
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your contacts and leads.
        </p>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-[40%]">
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
        </div>
      </div>

      <DataTable
        columns={[
          {
            accessorKey: "idx",
            header: "Id",
            cell: ({ row }: { row: any }) => (visibleColumns.id ? row.index + 1 : null),
          },
          {
            accessorKey: "firstName", // Using firstName for search
            header: "NAME",
            cell: ({ row }: { row: any }) => {
              if (!visibleColumns.name) return null;
              const contact = row.original;
              return (
                <div className="font-medium flex items-center gap-2">
                  {contact.avatarUrl && <img src={contact.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
                  {contact.firstName} {contact.lastName}
                </div>
              );
            },
          },
          {
            accessorKey: "email",
            header: "EMAIL",
            cell: ({ row }: { row: any }) => (visibleColumns.email ? row.getValue("email") : null),
          },
          {
            accessorKey: "zoneName",
            header: "Zone Name",
            cell: ({ row }: { row: any }) => (visibleColumns.zoneName ? (row.getValue("zoneName") || "-") : null),
          },
          {
            accessorKey: "contactStatus",
            header: "CURRENT STAGE",
            cell: ({ row }: { row: any }) => (visibleColumns.currentStage ? getStatusBadge(row.getValue("contactStatus")) : null),
          },
          {
            accessorKey: "fsrAssigned",
            header: "FSR Assigned",
            cell: ({ row }: { row: any }) => (visibleColumns.fsrAssigned ? (row.getValue("fsrAssigned") || "-") : null),
          },
          {
            accessorKey: "lastAppointment",
            header: "Last Appointment",
            cell: ({ row }: { row: any }) => {
              if (!visibleColumns.lastAppointment) return null;
              const val = row.getValue("lastAppointment");
              return val ? format(new Date(val as string), "MM-dd-yyyy") : "-";
            },
          },
          {
            accessorKey: "nextAppointment",
            header: "Next Appointment",
            cell: ({ row }: { row: any }) => {
              if (!visibleColumns.nextAppointment) return null;
              const val = row.getValue("nextAppointment");
              return val ? format(new Date(val as string), "MM-dd-yyyy") : "-";
            },
          },
          {
            accessorKey: "createdAt",
            header: "JOIN ON",
            cell: ({ row }: { row: any }) => {
              if (!visibleColumns.joinOn) return null;
              const val = row.getValue("createdAt");
              return val ? format(new Date(val as string), "yyyy-MM-dd HH:mm:ss") : "-";
            },
          },
          {
            accessorKey: "staxId",
            header: "STAX ID",
            cell: ({ row }: { row: any }) => {
              if (!visibleColumns.staxId) return null;
              const val = row.getValue("staxId");
              return val ? (
                <a href="#" className="text-primary flex items-center hover:underline">
                  Go to stax <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              ) : "-";
            },
          },
          {
            id: "actions",
            header: "ACTION",
            cell: ({ row }: { row: any }) => {
              if (!visibleColumns.action) return null;
              const contact = row.original;
              return (
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => router.push(`/dashboard/contacts/${contact._id}`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(contact._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            },
          },
        ].filter(col => {
          if (col.accessorKey) return (visibleColumns as any)[col.accessorKey];
          if (col.id === 'actions') return visibleColumns.action;
          return true;
        }) as ColumnDef<ContactType>[]}
        data={filteredContacts}
        searchPlaceholder="Keywords..."
        onFilterChange={(val) => setFilterData({ ...filterData, name: val })}
      />

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className=" ">
            <DialogTitle className="text-white text-lg font-bold">Filter model</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4 px-2">
            {/* Name Filter */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={filterData.name}
                onChange={e => setFilterData({ ...filterData, name: e.target.value })}
                placeholder="First Name"
              />
            </div>

            {/* Email Filter */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                value={filterData.email}
                onChange={e => setFilterData({ ...filterData, email: e.target.value })}
                placeholder="Email Address"
              />
            </div>

            {/* Customer Stage Filter */}
            <div className="space-y-2">
              <Label>Customer Stage</Label>
              <Select value={filterData.status} onValueChange={v => setFilterData({ ...filterData, status: v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new lead">New Lead</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="maturing">Maturing</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zone Filter */}
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select value={filterData.zone} onValueChange={v => setFilterData({ ...filterData, zone: v })}>
                <SelectTrigger><SelectValue placeholder="All Zones" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zonesList.map(zone => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Last Appointment Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last appointment</Label>
                <Input
                  type="date"
                  value={filterData.lastAppointmentFrom}
                  onChange={e => setFilterData({ ...filterData, lastAppointmentFrom: e.target.value })}
                  placeholder="mm/dd/yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label>Last appointment</Label>
                <Input
                  type="date"
                  value={filterData.lastAppointmentTo}
                  onChange={e => setFilterData({ ...filterData, lastAppointmentTo: e.target.value })}
                  placeholder="mm/dd/yyyy"
                />
              </div>
            </div>

            {/* Next Appointment Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Next appointment</Label>
                <Input
                  type="date"
                  value={filterData.nextAppointmentFrom}
                  onChange={e => setFilterData({ ...filterData, nextAppointmentFrom: e.target.value })}
                  placeholder="mm/dd/yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label>Next appointment</Label>
                <Input
                  type="date"
                  value={filterData.nextAppointmentTo}
                  onChange={e => setFilterData({ ...filterData, nextAppointmentTo: e.target.value })}
                  placeholder="mm/dd/yyyy"
                />
              </div>
            </div>

            {/* Not Have Booking From */}
            <div className="space-y-2">
              <Label>Not have booking from</Label>
              <Input
                value={filterData.notHaveBookingFrom}
                onChange={e => setFilterData({ ...filterData, notHaveBookingFrom: e.target.value })}
                placeholder="None"
              />
            </div>

            {/* Stax Data Radio Buttons */}
            <div className="space-y-3">
              <Label>Stax data</Label>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="stax-all"
                    name="staxData"
                    value="all"
                    checked={filterData.staxData === "all"}
                    onChange={e => setFilterData({ ...filterData, staxData: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="stax-all" className="cursor-pointer mb-0">All</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="stax-users"
                    name="staxData"
                    value="stax"
                    checked={filterData.staxData === "stax"}
                    onChange={e => setFilterData({ ...filterData, staxData: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="stax-users" className="cursor-pointer mb-0">Stax Users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="non-stax"
                    name="staxData"
                    value="non-stax"
                    checked={filterData.staxData === "non-stax"}
                    onChange={e => setFilterData({ ...filterData, staxData: e.target.value })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="non-stax" className="cursor-pointer mb-0">Non Stax Users</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-6 pt-4 border-t border-muted items-end justify-end w-full">
            <Button
              onClick={() => {
                setIsFilterModalOpen(false);
                toast.success("Filters applied");
              }}
              className="flex-1"
            >
              Filter
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsFilterModalOpen(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
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

              <div className="flex flex-row gap-4">
                {/* Drag & Drop Image Upload Area */}
                <div
                  className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 hover:bg-muted transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      setFileToUpload(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Building2 className="h-12 w-18 text-gray-400" />
                      <p className="text-xs text-gray-500">Click or Drag & Drop</p>

                    </div>
                  )}
                </div>

                {/* Upload Instructions */}
                <div className="flex-1 mt-3 p-2">
                  <Label htmlFor="logo">Upload *</Label>
                  <p className="text-sm text-muted-foreground mb-2">PNG, JPG up to 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="block w-75 border border-muted-foreground/50 rounded-md p-2 "
                    onChange={handleFileChange}
                  />

                </div>
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
                <div className="space-y-2">
                  <Label>Zone</Label>
                  <Select value={formData.zoneName} onValueChange={v => setFormData({ ...formData, zoneName: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Zone" /></SelectTrigger>
                    <SelectContent>
                      {zonesList.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>FSR Assigned</Label>
                  <Select value={formData.fsrAssigned} onValueChange={v => setFormData({ ...formData, fsrAssigned: v })}>
                    <SelectTrigger><SelectValue placeholder="Select FSR" /></SelectTrigger>
                    <SelectContent>
                      {usersList.map(u => (
                        <SelectItem key={u._id} value={`${u.firstName} ${u.lastName}`}>
                          {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectContent>
                      {statesList.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                      {statesList.length === 0 && (
                        <>
                          <SelectItem value="Alabama">Alabama</SelectItem>
                          <SelectItem value="California">California</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Zip Code</Label><Input value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} /></div>
              </div>

              <div className="space-y-2"><Label>Special instructions</Label><Input value={formData.specialInstructions} onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })} /></div>

              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  Booking Data (Service Defaults)
                </h3>
                <ServiceDefaults
                  editorData={formData.serviceDefaults}
                  onChange={(newData) => setFormData({ ...formData, serviceDefaults: newData })}
                />
              </div>
            </form>
          </div>

          <SheetFooter className="p-4 border-t gap-2 flex flex-row justify-end ">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
