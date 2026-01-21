"use client";

import { useState } from "react";
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
import { Search, Trash2 } from "lucide-react"; // Importing Trash2 as standard trash icon

// Mock data for Off Time table
const INITIAL_OFF_TIMES = [
  { id: 2112, startDate: "May-17-2021", startTime: "12:00 AM", endDate: "May-17-2021", endTime: "11:59 PM", status: "APPROVED", notes: "" },
  { id: 2114, startDate: "May-18-2021", startTime: "12:00 AM", endDate: "May-18-2021", endTime: "11:59 PM", status: "APPROVED", notes: "" },
  { id: 2183, startDate: "Jun-10-2021", startTime: "12:00 AM", endDate: "Jun-10-2021", endTime: "11:59 PM", status: "APPROVED", notes: "" },
  { id: 42, startDate: "Aug-06-2021", startTime: "8:00 AM", endDate: "Aug-06-2021", endTime: "8:00 PM", status: "APPROVED", notes: "" },
  { id: 45, startDate: "Aug-13-2021", startTime: "8:00 AM", endDate: "Aug-13-2021", endTime: "8:00 PM", status: "APPROVED", notes: "" },
    { id: 46, startDate: "Aug-15-2021", startTime: "8:00 AM", endDate: "Aug-15-2021", endTime: "8:00 PM", status: "APPROVED", notes: "" },
    { id: 125, startDate: "Aug-16-2021", startTime: "5:17 PM", endDate: "Sep-14-2021", endTime: "5:17 PM", status: "APPROVED", notes: "" },
    { id: 122, startDate: "Sep-24-2021", startTime: "8:00 AM", endDate: "Sep-24-2021", endTime: "6:00 PM", status: "APPROVED", notes: "" },
    { id: 170, startDate: "Oct-09-2021", startTime: "8:00 AM", endDate: "Oct-09-2021", endTime: "9:00 PM", status: "APPROVED", notes: "" },
    { id: 197, startDate: "Oct-22-2021", startTime: "8:00 AM", endDate: "Oct-22-2021", endTime: "5:00 PM", status: "APPROVED", notes: "" },
];

export function UserOffTime() {
    const [offTimes, setOffTimes] = useState(INITIAL_OFF_TIMES);

    const handleDelete = (id: number) => {
        setOffTimes(offTimes.filter(item => item.id !== id));
    };

  return (
    <div className="space-y-6">
       <div className="space-y-4">
          <div className="flex justify-start">
              <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Keywords..." className="pl-8" />
              </div>
          </div>

          <div className="border rounded-md">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[80px]">#</TableHead>
                          <TableHead>START DATE</TableHead>
                          <TableHead>START TIME</TableHead>
                          <TableHead>END DATE</TableHead>
                          <TableHead>END TIME</TableHead>
                          <TableHead>OFF TIME REQUEST</TableHead>
                          <TableHead>STATUS</TableHead>
                          <TableHead>NOTES</TableHead>
                          <TableHead className="w-[80px]">ACTION</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {offTimes.map((time) => (
                          <TableRow key={time.id}>
                              <TableCell className="font-medium">{time.id}</TableCell>
                              <TableCell>{time.startDate}</TableCell>
                              <TableCell>{time.startTime}</TableCell>
                              <TableCell>{time.endDate}</TableCell>
                              <TableCell>{time.endTime}</TableCell>
                              <TableCell></TableCell>
                              <TableCell>{time.status}</TableCell>
                              <TableCell>{time.notes}</TableCell>
                              <TableCell>
                                  <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => handleDelete(time.id)}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </div>
           
           {/* Pagination (Visual Mockup) */}
           <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
              <div className="flex items-center gap-2">
                   <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs px-3">10</span>
                   <span>Showing rows 1 to 10 of 152</span>
              </div>
               <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled>Back</Button>
                  <Button variant="default" size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <Button variant="outline" size="sm">4</Button>
                  <Button variant="outline" size="sm">5</Button>
                  <Button variant="outline" size="sm">Next</Button>
               </div>
           </div>

       </div>
    </div>
  );
}
