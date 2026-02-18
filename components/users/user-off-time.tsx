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
import { Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export interface OffTime {
    id: number | string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    status: string;
    notes: string;
    reason?: string;
}

interface UserOffTimeProps {
    data: OffTime[];
    onDelete?: (id: number | string) => void;
}

export function UserOffTime({ data, onDelete }: UserOffTimeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Filter
  const filteredData = data.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.reason?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query) ||
      String(item.id).toLowerCase().includes(query)
    );
  });

  // 2. Sort (Most recent start date first)
  // Note: dates are strings in "MMM-dd-yyyy" format. We need to parse them for sorting.
  // Ideally, parent should provide raw dates, but we can parse here.
  const sortedData = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB.getTime() - dateA.getTime();
  });

  // 3. Paginate
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
       <div className="space-y-4">
          <div className="flex justify-start">
              <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Keywords..." 
                    className="pl-8" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
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
                      {paginatedData.length > 0 ? (
                        paginatedData.map((time) => (
                          <TableRow key={time.id}>
                              <TableCell className="font-medium">
                                <span className="truncate max-w-[80px] block" title={String(time.id)}>{String(time.id).slice(-6)}</span>
                              </TableCell>
                              <TableCell>{time.startDate}</TableCell>
                              <TableCell>{time.startTime}</TableCell>
                              <TableCell>{time.endDate}</TableCell>
                              <TableCell>{time.endTime}</TableCell>
                              <TableCell>{time.reason || "-"}</TableCell>
                              <TableCell>{time.status}</TableCell>
                              <TableCell>{time.notes}</TableCell>
                              <TableCell>
                                  <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => onDelete && onDelete(time.id)}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </TableCell>
                          </TableRow>
                        ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={9} className="h-24 text-center">
                                  No results.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </div>
           
           {/* Pagination */}
           <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground mt-4 gap-4 sm:gap-0">
              <div className="flex items-center gap-2">
                   <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs px-3">{itemsPerPage}</span>
                   <span>
                       Showing rows {Math.min(startIndex + 1, sortedData.length)} to {Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length}
                   </span>
              </div>
               <div className="flex gap-1 flex-wrap justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    Back
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Simple logic to show a window of pages, or just first few for now as simplest implementation
                      // Better to just show current page context if many pages, but simple 1..N is fine for small N.
                      // Let's implement a simple sliding window or just 1 ... Total logic if complex.
                      // Given constraints, let's keep it simple: Show valid pages around current.
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                          p = currentPage - 2 + i;
                      }
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
               </div>
           </div>

       </div>
    </div>
  );
}
