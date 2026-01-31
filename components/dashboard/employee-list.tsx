"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  salary?: number;
}

interface EmployeeListProps {
  employees: Employee[];
}

export function EmployeeList({ employees }: EmployeeListProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const formatSalary = (salary?: number) => {
    if (!salary) return "+$0.00";
    return salary >= 0 ? `+$${salary.toLocaleString()}.00` : `-$${Math.abs(salary).toLocaleString()}.00`;
  };

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle className="text-base font-medium">Employee List</CardTitle>
        <p className="text-xs text-muted-foreground">
          List of all employees.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No employees found. Add your first employee to get started.
            </p>
          ) : (
            employees.map((employee) => (
              <div
                key={employee._id}
                className="flex items-center justify-between"
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
                <div className="text-sm font-medium">
                  {formatSalary(employee.salary)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
