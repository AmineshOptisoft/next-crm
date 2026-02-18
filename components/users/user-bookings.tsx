"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

interface UserBookingsProps {
    technicianId: string;
}

export function UserBookings({ technicianId }: UserBookingsProps) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalDocs, setTotalDocs] = useState(0);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            // Added sortBy=startDateTime to query params
            const res = await fetch(`/api/bookings?technicianId=${technicianId}&page=${page}&limit=10&sortBy=startDateTime&sortOrder=asc`);
            if (res.ok) {
                const data = await res.json();
                // API returns { bookings, total, page, totalPages } if paginated
                // or just array if not (but we are forcing pagination now for this call)
                if (Array.isArray(data)) {
                     // Fallback if API didn't paginate for some reason
                     setBookings(data);
                     setTotalPages(1);
                     setTotalDocs(data.length);
                } else {
                    setBookings(data.bookings || []);
                    setTotalPages(data.totalPages || 1);
                    setTotalDocs(data.total || 0);
                }
            }
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
        } finally {
            setLoading(false);
        }
    }, [technicianId, page]);

    useEffect(() => {
        if (technicianId) {
            fetchBookings();
        }
    }, [fetchBookings, technicianId]);

    const handlePrev = () => {
        if (page > 1) setPage(p => p - 1);
    };

    const handleNext = () => {
        if (page < totalPages) setPage(p => p + 1);
    };

    return (
        <div className="space-y-4">
            {/* 
            <div className="w-full max-w-sm">
                <Input 
                    placeholder="Filter by date..." 
                    className="w-[300px]"
                    disabled // Pending implementation
                />
            </div>
            */}

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold">CLIENT NAME</TableHead>
                            <TableHead className="font-bold">TECHNICIAN NAME</TableHead>
                            <TableHead className="font-bold">SERVICE NAME</TableHead>
                            <TableHead className="font-bold">ORDER DATE</TableHead>
                            <TableHead className="font-bold">ORDER TIME</TableHead>
                            <TableHead className="font-bold">STATUS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : bookings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No bookings found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            bookings.map((booking) => {
                                const start = new Date(booking.startDateTime);
                                return (
                                    <TableRow key={booking._id || booking.id}>
                                        <TableCell>
                                            {booking.contactId?.firstName} {booking.contactId?.lastName}
                                            <div className="text-xs text-muted-foreground">{booking.contactId?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {booking.technicianId?.firstName} {booking.technicianId?.lastName}
                                        </TableCell>
                                        <TableCell>{booking.serviceId?.name || "Service"}</TableCell>
                                        <TableCell>{format(start, "yyyy-MM-dd")}</TableCell>
                                        <TableCell>{format(start, "HH:mm")}</TableCell>
                                        <TableCell className="capitalize">{booking.status || "Scheduled"}</TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Showing {bookings.length} of {totalDocs} bookings
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePrev} 
                        disabled={page <= 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <div className="text-sm font-medium">
                        Page {page} of {totalPages}
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleNext} 
                        disabled={page >= totalPages || loading}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}