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
import { Plus, Pencil, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ContactOption {
  _id: string;
  name: string;
}

interface DealType {
  _id: string;
  title: string;
  value: number;
  stage: string;
  contactId?: {
    _id: string;
    name: string;
  } | null;
  closeDate?: string;
}

const NO_CONTACT_VALUE = "none";

function DatePicker({ date, setDate }: { date: Date | undefined; setDate: (date: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={2050}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export default function DealsPage() {
  const [deals, setDeals] = useState<DealType[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    value: "",
    stage: "new",
    contactId: NO_CONTACT_VALUE,
    closeDate: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch("/api/deals"),
        fetch("/api/contacts"),
      ]);
      if (dealsRes.ok) {
        const dealsData = await dealsRes.json();
        setDeals(dealsData);
      } else {
        const error = await dealsRes.json();
        toast.error(error.error || "Failed to fetch deals");
      }
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(
          contactsData.map((c: any) => ({ _id: c._id, name: c.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching deals/contacts:", e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function getStageBadge(stage: string) {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      new: "outline",
      qualified: "secondary",
      proposal: "default",
      won: "default",
      lost: "destructive",
    };
    return (
      <Badge variant={variants[stage] || "outline"}>
        {stage.charAt(0).toUpperCase() + stage.slice(1)}
      </Badge>
    );
  }

  function resetForm() {
    setEditingDeal(null);
    setFormData({
      title: "",
      value: "",
      stage: "new",
      contactId: NO_CONTACT_VALUE,
      closeDate: "",
    });
  }

  function handleEdit(deal: DealType) {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      value: deal.value.toString(),
      stage: deal.stage,
      contactId: deal.contactId?._id || NO_CONTACT_VALUE,
      closeDate: deal.closeDate
        ? new Date(deal.closeDate).toISOString().split("T")[0]
        : "",
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const url = editingDeal ? `/api/deals/${editingDeal._id}` : "/api/deals";
    const method = editingDeal ? "PUT" : "POST";

    const payload: any = {
      title: formData.title,
      value: formData.value ? parseFloat(formData.value) : 0,
      stage: formData.stage,
      closeDate: formData.closeDate || undefined,
    };

    if (formData.contactId && formData.contactId !== NO_CONTACT_VALUE) {
      payload.contactId = formData.contactId;
    } else {
      payload.contactId = null;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingDeal
            ? "Deal updated successfully"
            : "Deal created successfully"
        );
        await fetchAll();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save deal");
      }
    } catch (e) {
      console.error("Error saving deal:", e);
      toast.error("Failed to save deal");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    toast.promise(
      fetch(`/api/deals/${id}`, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to delete deal");
        }
        await fetchAll();
        return res;
      }).finally(() => setDeletingId(null)),
      {
        loading: "Deleting deal...",
        success: "Deal deleted successfully",
        error: (err) => err.message || "Failed to delete deal",
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Track and manage your sales pipeline
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDeal ? "Edit Deal" : "Add New Deal"}
              </DialogTitle>
              <DialogDescription>
                Fill in the deal information below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Value *</Label>
                    <Input
                      id="value"
                      type="number"
                      min={0}
                      required
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({ ...formData, value: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select
                      value={formData.stage}
                      onValueChange={(value) =>
                        setFormData({ ...formData, stage: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]" sideOffset={5} position="popper">
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactId">Contact</Label>
                    <Select
                      value={formData.contactId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contactId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]" sideOffset={5} position="popper">
                        <SelectItem value={NO_CONTACT_VALUE}>
                          No contact
                        </SelectItem>
                        {contacts.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closeDate">Close Date</Label>
                    <DatePicker
                      date={formData.closeDate ? new Date(formData.closeDate) : undefined}
                      setDate={(date) =>
                        setFormData({
                          ...formData,
                          // Use ISO string but just the date part if needed or full ISO
                          // The previous implementation used e.target.value which is yyyy-mm-dd
                          // We'll keep it compatible
                          closeDate: date ? format(date, "yyyy-MM-dd") : "",
                        })
                      }
                    />
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
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingDeal ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No deals yet. Create your first deal to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  deals.map((deal) => (
                    <TableRow key={deal._id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>${deal.value.toLocaleString()}</TableCell>
                      <TableCell>{getStageBadge(deal.stage)}</TableCell>
                      <TableCell>
                        {deal.contactId?.name || "No contact"}
                      </TableCell>
                      <TableCell>
                        {deal.closeDate
                          ? new Date(deal.closeDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(deal)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(deal._id)}
                            disabled={deletingId === deal._id}
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
        </div>
      )}
    </div>
  );
}
