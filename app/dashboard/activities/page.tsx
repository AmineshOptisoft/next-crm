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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Activity as ActivityIcon, Phone, Mail, Calendar, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Activity {
  _id: string;
  contactId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  dealId?: {
    _id: string;
    title: string;
  };
  type: string;
  subject: string;
  description?: string;
  duration?: number;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  status: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Deal {
  _id: string;
  title: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
}

export default function ActivitiesPage() {
  // Check permissions for this module
  const permissions = usePermissions("activities");
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [formData, setFormData] = useState({
    contactId: "",
    dealId: "",
    type: "call",
    subject: "",
    description: "",
    duration: "",
    outcome: "",
    scheduledAt: "",
    status: "scheduled",
    assignedTo: "",
  });
  const [savingActivity, setSavingActivity] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionLoadingType, setActionLoadingType] = useState<string | null>(null);
  const [deleteDialogActivityId, setDeleteDialogActivityId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
    fetchContacts();
    fetchDeals();
    fetchEmployees();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/activities");
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
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

  const fetchDeals = async () => {
    try {
      const response = await fetch("/api/deals");
      if (response.ok) {
        const data = await response.json();
        setDeals(data);
      }
    } catch (error) {
      console.error("Error fetching deals:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingActivity(true);
    try {
      const url = editingActivity
        ? `/api/activities/${editingActivity._id}`
        : "/api/activities";
      const method = editingActivity ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : undefined,
          dealId: formData.dealId || undefined,
          assignedTo: formData.assignedTo || undefined,
          outcome: formData.outcome || undefined,
        }),
      });

      if (response.ok) {
        toast.success(editingActivity ? "Activity updated" : "Activity logged");
        fetchActivities();
        setIsSheetOpen(false);
        resetForm();
      } else {
        toast.error("Failed to save activity");
      }
    } catch (error) {
      console.error("Error saving activity:", error);
      toast.error("Failed to save activity");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoadingId(id);
      setActionLoadingType("delete");
      const response = await fetch(`/api/activities/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Activity deleted");
        fetchActivities();
      } else {
        toast.error("Failed to delete activity");
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Failed to delete activity");
    } finally {
      setActionLoadingId(null);
      setActionLoadingType(null);
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      contactId: activity.contactId._id,
      dealId: activity.dealId?._id || "",
      type: activity.type,
      subject: activity.subject,
      description: activity.description || "",
      duration: activity.duration?.toString() || "",
      outcome: activity.outcome || "",
      scheduledAt: activity.scheduledAt
        ? new Date(activity.scheduledAt).toISOString().slice(0, 16)
        : "",
      status: activity.status,
      assignedTo: activity.assignedTo?._id || "",
    });
    setIsSheetOpen(true);
  };

  const handleComplete = async (id: string) => {
    try {
      setActionLoadingId(id);
      setActionLoadingType("complete");
      const response = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchActivities();
      }
    } catch (error) {
      console.error("Error completing activity:", error);
    } finally {
      setActionLoadingId(null);
      setActionLoadingType(null);
    }
  };

  const resetForm = () => {
    setEditingActivity(null);
    setFormData({
      contactId: "",
      dealId: "",
      type: "call",
      subject: "",
      description: "",
      duration: "",
      outcome: "",
      scheduledAt: "",
      status: "scheduled",
      assignedTo: "",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      scheduled: "outline",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return null;
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      successful: "default",
      unsuccessful: "destructive",
      "follow-up-required": "secondary",
      "no-answer": "outline",
    };
    return (
      <Badge variant={variants[outcome] || "outline"} className="text-xs">
        {outcome.replace("-", " ")}
      </Badge>
    );
  };

  const filteredActivities =
    filterType === "all"
      ? activities
      : activities.filter((a) => a.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground">
            Track all interactions with your contacts
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
            Log Activity
          </Button>
        )}
      </div>

      {/* Create/Edit Activity Sheet (replaces modal) */}
      {(permissions.canCreate || permissions.canEdit) && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
            <SheetHeader className="p-4 border-b gap-0">
              <SheetTitle>{editingActivity ? "Edit Activity" : "Log New Activity"}</SheetTitle>
              <SheetDescription>Record an interaction with a contact</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="activity-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Activity Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactId">Contact *</Label>
                    <Select
                      value={formData.contactId}
                      onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        {contacts.map((contact) => (
                          <SelectItem key={contact._id} value={contact._id}>
                            {contact.firstName} {contact.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dealId">Related Deal</Label>
                    <Select
                      value={formData.dealId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, dealId: value === "none" ? "" : value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select deal (optional)" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        <SelectItem value="none">None</SelectItem>
                        {deals.map((deal) => (
                          <SelectItem key={deal._id} value={deal._id}>
                            {deal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Select
                      value={formData.assignedTo || "none"}
                      onValueChange={(value) => setFormData({ ...formData, assignedTo: value === "none" ? "" : value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select employee (optional)" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        <SelectItem value="none">None</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Scheduled At</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.status === "completed" && (
                  <div className="space-y-2">
                    <Label htmlFor="outcome">Outcome</Label>
                    <Select value={formData.outcome} onValueChange={(value) => setFormData({ ...formData, outcome: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="successful">Successful</SelectItem>
                        <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
                        <SelectItem value="follow-up-required">Follow-up Required</SelectItem>
                        <SelectItem value="no-answer">No Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)} disabled={savingActivity}>
                Cancel
              </Button>
              <Button type="submit" form="activity-form" disabled={savingActivity}>
                {savingActivity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingActivity ? "Update" : "Log Activity"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="call">Calls</TabsTrigger>
          <TabsTrigger value="email">Emails</TabsTrigger>
          <TabsTrigger value="meeting">Meetings</TabsTrigger>
          <TabsTrigger value="note">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="mt-4">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading activities...</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <ActivityIcon className="h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No activities found. Log your first activity to get
                            started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => (
                      <TableRow key={activity._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(activity.type)}
                            <div>
                              <div className="font-medium">{activity.subject}</div>
                              {activity.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {activity.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{activity.contactId.firstName} {activity.contactId.lastName}</TableCell>
                        <TableCell>
                          {activity.dealId ? (
                            activity.dealId.title
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {activity.scheduledAt ? (
                            new Date(activity.scheduledAt).toLocaleString()
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(activity.status)}</TableCell>
                        <TableCell>{getOutcomeBadge(activity.outcome)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {permissions.canEdit && activity.status === "scheduled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleComplete(activity._id)}
                                disabled={actionLoadingId === activity._id}
                              >
                                {actionLoadingId === activity._id &&
                                  actionLoadingType === "complete" && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                Complete
                              </Button>
                            )}
                            {permissions.canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(activity)}
                                disabled={actionLoadingId === activity._id}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {permissions.canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteDialogActivityId(activity._id)}
                                disabled={actionLoadingId === activity._id}
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

      {/* Delete Activity Confirmation */}
      <Dialog
        open={!!deleteDialogActivityId}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogActivityId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogActivityId(null)}
              disabled={!!actionLoadingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteDialogActivityId || !!actionLoadingId}
              onClick={() => {
                if (deleteDialogActivityId) {
                  handleDelete(deleteDialogActivityId);
                }
              }}
            >
              {actionLoadingId === deleteDialogActivityId &&
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
