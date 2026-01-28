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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Shield, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole: boolean;
  isActive: boolean;
  // Hierarchy fields removed
  companyId?: {
    _id: string;
    name: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

const MODULES = [
  "dashboard",
  "employees",
  "tasks",
  "contacts",
  "deals",
  "products",
  "invoices",
  "meetings",
  "activities",
  "analytics",
  "settings",
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewRole, setViewRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    // Hierarchy fields removed
    permissions: MODULES.map((module) => ({
      module,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
    })),
  });

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      const url = editingRole ? `/api/roles/${editingRole._id}` : "/api/roles";
      const method = editingRole ? "PUT" : "POST";

      // Construct precise payload matching the Schema
      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        // Hierarchy fields removed
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchRoles();
        setIsDialogOpen(false);
        resetForm();
        toast.success(editingRole ? "Role updated successfully" : "Role created successfully");
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        toast.error(error.error || `Failed to ${editingRole ? "update" : "create"} role`);
      }
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error(`Failed to ${editingRole ? "update" : "create"} role`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setRoleToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    setDeletingId(roleToDelete);
    try {
      const response = await fetch(`/api/roles/${roleToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchRoles();
        toast.success("Role deleted successfully");
        setIsDeleteDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    } finally {
      setDeletingId(null);
      setRoleToDelete(null); // Ensure cleanup but after dialog might be closed
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      // Hierarchy fields removed
      permissions: MODULES.map((module) => {
        const existing = role.permissions.find((p) => p.module === module);
        return (
          existing || {
            module,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canExport: false,
          }
        );
      }),
    });
    setIsDialogOpen(true);
  };

  const updatePermission = (
    moduleIndex: number,
    field: keyof Omit<Permission, "module">,
    value: boolean
  ) => {
    const newPermissions = [...formData.permissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      [field]: value,
    };
    setFormData({ ...formData, permissions: newPermissions });
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      // Hierarchy fields removed
      permissions: MODULES.map((module) => ({
        module,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
      })),
    });
  };

  const countPermissions = (permissions: Permission[]) => {
    let count = 0;
    permissions.forEach((p) => {
      if (p.canView) count++;
      if (p.canCreate) count++;
      if (p.canEdit) count++;
      if (p.canDelete) count++;
      if (p.canExport) count++;
    });
    return count;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Manage user roles and their access permissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Role" : "Create New Role"}
              </DialogTitle>
              <DialogDescription>
                Define role name and set permissions for each module
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, name: val }));
                      }}
                      placeholder="e.g., Customer Support"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, description: val }));
                      }}
                      placeholder="Brief description of this role"
                    />
                  </div>
                </div>



                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Module</TableHead>
                          <TableHead className="text-center">View</TableHead>
                          <TableHead className="text-center">Create</TableHead>
                          <TableHead className="text-center">Edit</TableHead>
                          <TableHead className="text-center">Delete</TableHead>
                          <TableHead className="text-center">Export</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.permissions.map((permission, index) => (
                          <TableRow key={permission.module}>
                            <TableCell className="font-medium capitalize">
                              {permission.module}
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.canView}
                                onCheckedChange={(checked: any) =>
                                  updatePermission(index, "canView", !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.canCreate}
                                onCheckedChange={(checked: any) =>
                                  updatePermission(index, "canCreate", !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.canEdit}
                                onCheckedChange={(checked: any) =>
                                  updatePermission(index, "canEdit", !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.canDelete}
                                onCheckedChange={(checked: any) =>
                                  updatePermission(index, "canDelete", !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.canExport}
                                onCheckedChange={(checked: any) =>
                                  updatePermission(index, "canExport", !!checked)
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRole ? "Update Role" : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading roles...</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No roles found. Create your first custom role to get started.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role._id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      {role.description || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.isSystemRole ? (
                        <span className="text-muted-foreground italic">All Companies</span>
                      ) : role.companyId?.name ? (
                        role.companyId.name
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {countPermissions(role.permissions)} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.isSystemRole ? (
                        <Badge variant="default">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(role.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewRole(role)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!role.isSystemRole && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(role._id)}
                              disabled={deletingId === role._id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Role Dialog */}
      <Dialog open={!!viewRole} onOpenChange={() => setViewRole(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRole?.name}</DialogTitle>
            <DialogDescription>{viewRole?.description}</DialogDescription>
          </DialogHeader>
          {viewRole && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Role Type</h3>
                  {viewRole.isSystemRole ? (
                    <Badge variant="default">System Role</Badge>
                  ) : (
                    <Badge variant="outline">Custom Role</Badge>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Created</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(viewRole.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Permissions</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center">View</TableHead>
                        <TableHead className="text-center">Create</TableHead>
                        <TableHead className="text-center">Edit</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                        <TableHead className="text-center">Export</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewRole.permissions.map((permission) => (
                        <TableRow key={permission.module}>
                          <TableCell className="font-medium capitalize">
                            {permission.module}
                          </TableCell>
                          <TableCell className="text-center">
                            {permission.canView ? "✓" : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {permission.canCreate ? "✓" : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {permission.canEdit ? "✓" : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {permission.canDelete ? "✓" : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {permission.canExport ? "✓" : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setRoleToDelete(null);
              }}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId !== null}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
