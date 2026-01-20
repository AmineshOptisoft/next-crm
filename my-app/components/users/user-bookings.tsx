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
import { ChevronLeft, ChevronRight } from "lucide-react";

// Mock data matching the screenshot
const BOOKINGS = [
  { id: 1, client: "Sarah Amose", tech: "Ana Hernandez", service: "House Cleaning", date: "2025-06-26", time: "09:00" },
  { id: 2, client: "David Fountain", tech: "Ana Hernandez", service: "House Cleaning", date: "2025-04-30", time: "12:00" },
  { id: 3, client: "Lisa Cachola", tech: "Ana Hernandez", service: "House Cleaning", date: "2025-07-12", time: "09:00" },
  { id: 4, client: "Tatiana Bosquet", tech: "Ana Hernandez", service: "House Cleaning", date: "2025-07-11", time: "12:00" },
  { id: 5, client: "Linda Eaton", tech: "Ana Hernandez", service: "House Cleaning", date: "2026-01-21", time: "09:00" },
  { id: 6, client: "Debbie Duffy", tech: "Ana Hernandez", service: "House Cleaning", date: "2026-01-23", time: "09:00" },
  { id: 7, client: "Corrie Clay", tech: "Ana Hernandez", service: "House Cleaning", date: "2025-12-12", time: "04:00" },
  { id: 8, client: "Karil Skrukrud-Adams", tech: "Ana Hernandez", service: "House Cleaning", date: "2026-01-07", time: "09:00" },
  { id: 9, client: "Valerie Ross", tech: "Ana Hernandez", service: "House Cleaning", date: "2025-11-12", time: "03:00" },
  { id: 10, client: "Sandy Hamilton", tech: "Ana Hernandez", service: "House Cleaning", date: "2026-01-23", time: "09:00" },
];

export function UserBookings() {
  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <Input 
            placeholder="20-01-2026 16:03 - 25-01-2026 16:03" 
            className="w-[300px]"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">CLIENT NAME ↑↓</TableHead>
              <TableHead className="font-bold">TECHNICIAN NAME ↑↓</TableHead>
              <TableHead className="font-bold">SERVICE NAME ↑↓</TableHead>
              <TableHead className="font-bold">ORDER DATE ↑↓</TableHead>
              <TableHead className="font-bold">ORDER TIME ↑↓</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BOOKINGS.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.client}</TableCell>
                <TableCell>{booking.tech}</TableCell>
                <TableCell>{booking.service}</TableCell>
                <TableCell>{booking.date}</TableCell>
                <TableCell>{booking.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-8 w-12">10</Button>
            <span className="text-sm text-muted-foreground">Showing rows 1 to 10 of 18</span>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8">Back</Button>
            <Button variant="default" className="h-8 w-8">1</Button>
            <Button variant="outline" className="h-8 w-8">2</Button>
            <Button variant="outline" className="h-8">Next</Button>
        </div>
      </div>
    </div>
  );
}
