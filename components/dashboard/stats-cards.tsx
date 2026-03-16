"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardsProps {
  employeeStats: {
    total: number;
    growth: number;
    addedLastMonth: number;
  };
  leavesStats: {
    total: number;
    lastMonth: number;
    thisMonth: number;
  };
}

export function StatsCards({ employeeStats, leavesStats }: StatsCardsProps) {
  // Use growth value computed on the server (based on current vs last month totals)
  const employeeGrowthPositive = employeeStats.growth >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{employeeStats.total}</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {employeeGrowthPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={employeeGrowthPositive ? "text-green-500" : "text-red-500"}>
              {employeeGrowthPositive ? "+" : ""}
              {employeeStats.growth.toFixed(1)}%
            </span>
            <span>from last month</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {employeeStats.addedLastMonth} employees were added last month
          </p>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leaves</CardTitle>
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
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{leavesStats.thisMonth}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {leavesStats.thisMonth} leaves/time offs taken this month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
