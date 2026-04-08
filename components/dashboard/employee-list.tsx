"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  salary?: number;
  role?: string;
}

interface EmployeeListProps {
  employees: Employee[];
}

export function EmployeeList({ employees }: EmployeeListProps) {
  const visibleEmployees = employees.filter(
    (employee) => employee.role !== "company_admin" && employee.role !== "admin"
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const formatSalary = (salary?: number) => {
    if (!salary) return "+$0.00";
    return salary >= 0 ? `+$${salary.toLocaleString()}.00` : `-$${Math.abs(salary).toLocaleString()}.00`;
  };

  return (
    <Card className="py-4 max-h-screen overflow-y-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
        <div className="flex flex-col justify-center gap-2">

        <CardTitle className="text-base font-medium">Employee List</CardTitle>
        <p className="text-xs text-muted-foreground">
          Showing 10 most recent employees.
        </p>
        </div>
        {visibleEmployees.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/users">Show more</Link>
            </Button>
          </div>
          )}
          </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleEmployees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No employees found. Add your first employee to get started.
              </p>
              <Button asChild size="sm">
                <Link href="/dashboard/users">Create Technician</Link>
              </Button>
            </div>
          ) : (
            visibleEmployees.map((employee) => (
              <div
                key={employee._id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(employee.firstName, employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employee.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="icon">
                    <Link href={`/dashboard/users/${employee._id}`} aria-label={`Edit ${employee.firstName} ${employee.lastName}`}>
                    <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
      </CardContent>
    </Card>
  );
}
