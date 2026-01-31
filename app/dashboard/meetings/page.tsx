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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Video, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    contactId?: { _id: string; name: string };
    employeeId?: { _id: string; firstName: string; lastName: string };
    email?: string;
    name?: string;
    status: string;
  }>;
  dealId?: { _id: string; title: string };
  status: string;
  notes?: string;
}

interface Contact {
  _id: string;
  name: string;
  email?: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);
  
  // Sync internal state with props
  useEffect(() => {
      setSelectedDate(date);
  }, [date]);

  const handleSelect = (newDate: Date | undefined) => {
      if (!newDate) return;
      if (!selectedDate) {
          setSelectedDate(newDate);
          setDate(newDate);
          return;
      }
      // Keep the time from the previous selection, defaults to 00:00 if just picked
      const newDateTime = new Date(newDate);
      newDateTime.setHours(selectedDate.getHours());
      newDateTime.setMinutes(selectedDate.getMinutes());
      setSelectedDate(newDateTime);
      setDate(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [hours, minutes] = e.target.value.split(':').map(Number);
      if (!selectedDate) return; // Should pick date first
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours);
      newDateTime.setMinutes(minutes);
      setSelectedDate(newDateTime);
      setDate(newDateTime);
  };

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
          {date ? format(date, "PPP p") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="time" className="sr-only">Time</Label>
              <Input
                  type="time"
                  value={selectedDate ? format(selectedDate, "HH:mm") : ""}
                  onChange={handleTimeChange}
                  className="flex-1"
              />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    meetingLink: "",
    startTime: "",
    endTime: "",
    attendees: [] as Array<{ contactId?: string; employeeId?: string }>,
    notes: "",
  });

  useEffect(() => {
    fetchMeetings();
    fetchContacts();
    fetchEmployees();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings");
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch meetings");
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load meetings");
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
    setIsSaving(true);
    try {
      const url = editingMeeting
        ? `/api/meetings/${editingMeeting._id}`
        : "/api/meetings";
      const method = editingMeeting ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingMeeting
            ? "Meeting updated successfully"
            : "Meeting scheduled successfully"
        );
        fetchMeetings();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save meeting");
      }
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error("Failed to save meeting");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    toast.promise(
      fetch(`/api/meetings/${id}`, { method: "DELETE" }).then(async (response) => {
       if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete meeting");
        }
        await fetchMeetings();
        return response;
      }).finally(() => setDeletingId(null)),
      {
        loading: "Deleting meeting...",
        success: "Meeting deleted successfully",
        error: (err) => err.message || "Failed to delete meeting",
      }
    );
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      description: meeting.description || "",
      location: meeting.location || "",
      meetingLink: meeting.meetingLink || "",
      startTime: new Date(meeting.startTime).toISOString().slice(0, 16),
      endTime: new Date(meeting.endTime).toISOString().slice(0, 16),
      attendees: meeting.attendees.map((a) => ({
        contactId: a.contactId?._id,
        employeeId: a.employeeId?._id,
      })),
      notes: meeting.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success("Meeting status updated successfully");
        fetchMeetings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast.error("Failed to update status");
    }
  };

  const addAttendee = (type: "contact" | "employee", id: string) => {
    const newAttendee =
      type === "contact" ? { contactId: id } : { employeeId: id };
    setFormData({
      ...formData,
      attendees: [...formData.attendees, newAttendee],
    });
  };

  const removeAttendee = (index: number) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setEditingMeeting(null);
    setFormData({
      title: "",
      description: "",
      location: "",
      meetingLink: "",
      startTime: "",
      endTime: "",
      attendees: [],
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      scheduled: "outline",
      "in-progress": "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const filteredMeetings =
    filterStatus === "all"
      ? meetings
      : filterStatus === "upcoming"
      ? meetings.filter(
          (m) => new Date(m.startTime) > new Date() && m.status === "scheduled"
        )
      : filterStatus === "past"
      ? meetings.filter((m) => new Date(m.startTime) < new Date())
      : meetings.filter((m) => m.status === filterStatus);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Schedule and manage meetings with your team and contacts
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMeeting ? "Edit Meeting" : "Schedule New Meeting"}
              </DialogTitle>
              <DialogDescription>
                Fill in the meeting details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <DateTimePicker
                      date={formData.startTime ? new Date(formData.startTime) : undefined}
                      setDate={(date) => {
                         if (!date) return;
                         // Keep strict ISO string
                         const iso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                         setFormData({ ...formData, startTime: iso });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time *</Label>
                    <DateTimePicker
                      date={formData.endTime ? new Date(formData.endTime) : undefined}
                      setDate={(date) => {
                          if (!date) return;
                          const iso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                          setFormData({ ...formData, endTime: iso });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="Office, Conference Room, etc."
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meetingLink">Virtual Meeting Link</Label>
                    <Input
                      id="meetingLink"
                      type="url"
                      placeholder="https://zoom.us/..."
                      value={formData.meetingLink}
                      onChange={(e) =>
                        setFormData({ ...formData, meetingLink: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Attendees</Label>
                  <div className="flex gap-2">
                    <Select onValueChange={(id) => addAttendee("contact", id)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add contact" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        {contacts.map((contact) => (
                          <SelectItem key={contact._id} value={contact._id}>
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select onValueChange={(id) => addAttendee("employee", id)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add employee" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} className="z-[100]">
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.attendees.map((attendee, index) => {
                      const contact = contacts.find(
                        (c) => c._id === attendee.contactId
                      );
                      const employee = employees.find(
                        (e) => e._id === attendee.employeeId
                      );
                      const name = contact
                        ? contact.name
                        : employee
                        ? `${employee.firstName} ${employee.lastName}`
                        : "Unknown";

                      return (
                        <Badge key={index} variant="secondary">
                          {name}
                          <button
                            type="button"
                            onClick={() => removeAttendee(index)}
                            className="ml-2 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
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
                  {editingMeeting ? "Update" : "Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="mt-4">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading meetings...</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CalendarIcon className="h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No meetings found. Schedule your first meeting to get
                            started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMeetings.map((meeting) => (
                      <TableRow key={meeting._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{meeting.title}</div>
                            {meeting.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {meeting.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDateTime(meeting.startTime)}</div>
                            <div className="text-muted-foreground">
                              to {new Date(meeting.endTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {meeting.meetingLink ? (
                              <a
                                href={meeting.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                <Video className="h-4 w-4" />
                                Virtual
                              </a>
                            ) : meeting.location ? (
                              meeting.location
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {meeting.attendees.slice(0, 2).map((attendee, idx) => {
                              const name = attendee.contactId
                                ? attendee.contactId.name
                                : attendee.employeeId
                                ? `${attendee.employeeId.firstName} ${attendee.employeeId.lastName}`
                                : attendee.name || "Unknown";
                              return (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {name}
                                </Badge>
                              );
                            })}
                            {meeting.attendees.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{meeting.attendees.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {meeting.status === "scheduled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(meeting._id, "completed")
                                }
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(meeting)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(meeting._id)}
                              disabled={deletingId === meeting._id}
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
    </div>
  );
}
