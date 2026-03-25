"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TechnicianStatsCardsProps {
  totalBookings: number;
  totalCompletedBookings: number;
}

export function TechnicianStatsCards({
  totalBookings,
  totalCompletedBookings,
}: TechnicianStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M8 7h8" />
            <path d="M7 12h10" />
            <path d="M9 17h6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBookings}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total bookings assigned to you
          </p>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Completed Bookings
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCompletedBookings}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Completed bookings assigned to you
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

