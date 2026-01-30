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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProtectedPage } from "@/components/protected-page";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  customRoleId?: any;
  position?: string;
  department?: string;
  salary?: number;
  employeeStatus: string;
  hireDate?: string;
}

interface RoleType {
  _id: string;
  name: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee",
    customRoleId: "",
    position: "",
    department: "",
    salary: "",
    employeeStatus: "active",
    hireDate: "",
  });

  const { hasPermission } = usePermissions();

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEmployee
        ? `/api/employees/${editingEmployee._id}`
        : "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          salary: formData.salary ? parseFloat(formData.salary) : undefined,
        }),
      });

      if (response.ok) {
        toast.success(
          editingEmployee
            ? "Employee updated successfully"
            : "Employee created successfully"
        );
        fetchEmployees();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save employee");
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error("Failed to save employee");
    }
  };

  const handleDelete = async (id: string) => {
    toast.promise(
      fetch(`/api/employees/${id}`, { method: "DELETE" }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete employee");
        }
        await fetchEmployees();
        return response;
      }),
      {
        loading: "Deleting employee...",
        success: "Employee deleted successfully",
        error: (err) => err.message || "Failed to delete employee",
      }
    );
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      password: "",
      role: employee.role || "employee",
      customRoleId: typeof employee.customRoleId === 'string' ? employee.customRoleId : employee.customRoleId?._id || "",
      position: employee.position || "",
      department: employee.department || "",
      salary: employee.salary?.toString() || "",
      employeeStatus: employee.employeeStatus,
      hireDate: employee.hireDate
        ? new Date(employee.hireDate).toISOString().split("T")[0]
        : "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "employee",
      customRoleId: "",
      position: "",
      department: "",
      salary: "",
      employeeStatus: "active",
      hireDate: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      "on-leave": "secondary",
      terminated: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("-", " ")}
      </Badge>
    );
  };

  return (
    <ProtectedPage module="employees" requiredPermission="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground">
              Manage your team members and their information
            </p>
          </div>
          {hasPermission("employees", "create") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? "Edit Employee" : "Add New Employee"}
                  </DialogTitle>
                  <DialogDescription>
                    Fill in the employee information below
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          required
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          required
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">{editingEmployee ? "Password (leave blank to keep)" : "Password *"}</Label>
                        <Input
                          id="password"
                          type="password"
                          required={!editingEmployee}
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Security Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) =>
                            setFormData({ ...formData, role: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company_admin">Company Admin</SelectItem>
                            <SelectItem value="company_user">Company User</SelectItem>
                            <SelectItem value="employee">Employee (No Login)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customRoleId">Custom Permissions Role</Label>
                        <Select
                          value={formData.customRoleId || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, customRoleId: value === "none" ? "" : value })
                          }
                          disabled={formData.role !== "company_user"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select custom role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {roles.map((role) => (
                              <SelectItem key={role._id} value={role._id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) =>
                            setFormData({ ...formData, position: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) =>
                            setFormData({ ...formData, department: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="salary">Salary</Label>
                        <Input
                          id="salary"
                          type="number"
                          value={formData.salary}
                          onChange={(e) =>
                            setFormData({ ...formData, salary: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.employeeStatus}
                          onValueChange={(value) =>
                            setFormData({ ...formData, employeeStatus: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="on-leave">On Leave</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Hire Date</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        value={formData.hireDate}
                        onChange={(e) =>
                          setFormData({ ...formData, hireDate: e.target.value })
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
                    <Button type="submit">
                      {editingEmployee ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading employees...</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <p className="text-muted-foreground">
                          No employees found. Add your first employee to get started.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => (
                      <TableRow key={employee._id}>
                        <TableCell className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.position || "-"}</TableCell>
                        <TableCell>{employee.department || "-"}</TableCell>
                        <TableCell>
                          {employee.salary
                            ? `$${employee.salary.toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(employee.employeeStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasPermission("employees", "edit") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(employee)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission("employees", "delete") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(employee._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
