"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Technician {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
}

interface TimeOffRequest {
    _id: string;
    technicianId: Technician;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    notes: string;
    createdAt: string;
}

const STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
];

const REQUEST_TYPE_OPTIONS = [
    "Sick Time",
    "Unrequested Absence",
    "Vacation Time",
    "Unpaid Time Off",
];

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, string> = {
        PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
        APPROVED: "bg-green-100 text-green-800 border-green-300",
        REJECTED: "bg-red-100 text-red-800 border-red-300",
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-gray-100 text-gray-800"}`}
        >
            {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
    );
}

export default function OffTimeRequestPage() {
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTechnician, setSelectedTechnician] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);
    const [editForm, setEditForm] = useState({
        startDate: "",
        endDate: "",
        reason: "",
        status: "PENDING",
        notes: "",
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedStatus !== "all") params.set("status", selectedStatus);
            if (selectedTechnician !== "all") params.set("technicianId", selectedTechnician);

            const res = await fetch(`/api/time-off?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
                // Build unique technician list
                const techMap = new Map<string, Technician>();
                data.forEach((r: TimeOffRequest) => {
                    if (r.technicianId?._id) {
                        techMap.set(r.technicianId._id, r.technicianId);
                    }
                });
                setTechnicians(Array.from(techMap.values()));
            }
        } catch (err) {
            console.error("Failed to fetch off-time requests:", err);
            toast.error("Failed to load off-time requests");
        } finally {
            setLoading(false);
        }
    }, [selectedStatus, selectedTechnician]);

    // Fetch all technicians for filter dropdown
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/users");
                if (res.ok) {
                    const data = await res.json();
                    const users = Array.isArray(data) ? data : [];
                    setTechnicians(users);
                }
            } catch {
                // ignore
            }
        })();
    }, []);

    useEffect(() => {
        fetchRequests();
    }, []); // initial load without filters

    const handleFilter = () => {
        setCurrentPage(1);
        fetchRequests();
    };

    const handleEdit = (request: TimeOffRequest) => {
        setEditingRequest(request);
        setEditForm({
            startDate: request.startDate
                ? format(new Date(request.startDate), "yyyy-MM-dd'T'HH:mm")
                : "",
            endDate: request.endDate
                ? format(new Date(request.endDate), "yyyy-MM-dd'T'HH:mm")
                : "",
            reason: request.reason,
            status: request.status,
            notes: request.notes ?? "",
        });
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingRequest) return;
        setIsSaving(true);
        try {
            const startDateObj = new Date(editForm.startDate);
            const endDateObj = new Date(editForm.endDate);

            const res = await fetch(`/api/time-off/${editingRequest._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: editForm.status,
                    startDate: startDateObj.toISOString(),
                    endDate: endDateObj.toISOString(),
                    startTime: format(startDateObj, "hh:mm a"),
                    endTime: format(endDateObj, "hh:mm a"),
                    reason: editForm.reason,
                    notes: editForm.notes,
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setRequests((prev) =>
                    prev.map((r) => (r._id === updated._id ? updated : r))
                );
                toast.success("Time-off request updated successfully");
                setEditDialogOpen(false);
            } else {
                const err = await res.json();
                toast.error(err.error ?? "Failed to update request");
            }
        } catch {
            toast.error("Failed to update request");
        } finally {
            setIsSaving(false);
        }
    };

    // Pagination
    const totalPages = Math.ceil(requests.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRequests = requests.slice(startIndex, startIndex + itemsPerPage);

    const getTechnicianName = (tech: Technician) =>
        [tech.firstName, tech.lastName].filter(Boolean).join(" ") || tech.email;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Off Time Requests</h1>
                <p className="text-muted-foreground">
                    Review and manage all technician off-time requests
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Technician</label>
                    <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                        <SelectTrigger className="w-[220px]" id="filter-technician">
                            <SelectValue placeholder="Select Technician" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Technicians</SelectItem>
                            {technicians.map((t) => (
                                <SelectItem key={t._id} value={t._id}>
                                    {getTechnicianName(t)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Request Status</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[180px]" id="filter-status">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button id="filter-btn" onClick={handleFilter} className="self-end">
                    Filter
                </Button>
            </div>

            {/* Table title */}
            <h2 className="text-lg font-semibold">Off Time Request Sheet</h2>

            {/* Table */}
            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">#</TableHead>
                            <TableHead>TECHNICIAN NAME</TableHead>
                            <TableHead>START DATE</TableHead>
                            <TableHead>START TIME</TableHead>
                            <TableHead>END DATE</TableHead>
                            <TableHead>END TIME</TableHead>
                            <TableHead>OFF TIME REQUEST NOTES</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>NOTES</TableHead>
                            <TableHead className="w-[80px]">ACTION</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        <span className="text-muted-foreground">Loading requests...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : paginatedRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Clock className="h-10 w-10 text-muted-foreground" />
                                        <p className="text-muted-foreground">No off-time requests found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRequests.map((req) => (
                                <TableRow key={req._id}>
                                    <TableCell className="font-medium text-xs text-muted-foreground">
                                        {String(req._id).slice(-6).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        {req.technicianId ? (
                                            <span className="text-primary font-medium">
                                                {getTechnicianName(req.technicianId)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {req.startDate
                                            ? format(new Date(req.startDate), "MMM-dd-yyyy")
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{req.startTime}</TableCell>
                                    <TableCell>
                                        {req.endDate
                                            ? format(new Date(req.endDate), "MMM-dd-yyyy")
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{req.endTime}</TableCell>
                                    <TableCell>
                                        <span className="text-primary">{req.reason}</span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={req.status} />
                                    </TableCell>
                                    <TableCell className="max-w-[180px]">
                                        <span className="text-sm">{req.notes || "—"}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            id={`edit-btn-${req._id}`}
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 bg-primary hover:bg-primary/90"
                                            onClick={() => handleEdit(req)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {!loading && requests.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded text-xs">
                            {itemsPerPage}
                        </span>
                        <span>
                            Showing {Math.min(startIndex + 1, requests.length)} to{" "}
                            {Math.min(startIndex + itemsPerPage, requests.length)} of {requests.length}
                        </span>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        >
                            Back
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = i + 1;
                            if (totalPages > 5 && currentPage > 3) p = currentPage - 2 + i;
                            if (p > totalPages) return null;
                            return (
                                <Button
                                    key={p}
                                    variant={currentPage === p ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(p)}
                                >
                                    {p}
                                </Button>
                            );
                        })}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Edit Time Sheet Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} >
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden ">
                    <DialogHeader className="p-4 text-primary">
                        <DialogTitle className="text-lg font-semibold">Edit Time Sheet</DialogTitle>
                    </DialogHeader>

                    <div className="p-6 grid gap-5">
                        {/* Start Time */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-start-time">Start Time</Label>
                            <input
                                id="edit-start-time"
                                type="datetime-local"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={editForm.startDate}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                                }
                            />
                        </div>

                        {/* Stop Time */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-end-time">Stop Time</Label>
                            <input
                                id="edit-end-time"
                                type="datetime-local"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={editForm.endDate}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                                }
                            />
                        </div>

                        {/* Request Type */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-reason">Request type</Label>
                            <Select
                                value={editForm.reason}
                                onValueChange={(val) =>
                                    setEditForm((prev) => ({ ...prev, reason: val }))
                                }
                            >
                                <SelectTrigger id="edit-reason" className="w-full">
                                    <SelectValue placeholder="Select request type" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[200]" sideOffset={5}>
                                    {REQUEST_TYPE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Request Status */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-status">Request Status</Label>
                            <Select
                                value={editForm.status}
                                onValueChange={(val) =>
                                    setEditForm((prev) => ({ ...prev, status: val }))
                                }
                            >
                                <SelectTrigger id="edit-status" className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[200]" sideOffset={5}>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Notes */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
                                placeholder="Add notes..."
                                className="min-h-[100px]"
                                value={editForm.notes}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-end gap-2 p-6 pt-0">
                        <Button
                            id="edit-update-btn"
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground min-w-[100px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Update"
                            )}
                        </Button>
                        <Button
                            id="edit-cancel-btn"
                            variant="destructive"
                            onClick={() => setEditDialogOpen(false)}
                            className="min-w-[100px]"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
