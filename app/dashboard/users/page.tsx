"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, UserCheck, UserX, Loader2, Star, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  customRoleId?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  averageRating?: number | null;
  totalReviews?: number;
}

interface Role {
  _id: string;
  name: string;
}

type SortColumn = "name" | "email" | "role" | "averageRating" | "status" | "joined";
type SortDirection = "asc" | "desc";

export default function UsersPage() {
  const { data: rawUsers, isLoading: loadingUsers, mutate: mutateUsers } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: rawRoles } = useSWR('/api/roles', fetcher, {
    revalidateOnFocus: false,
  });

  const users: User[] = rawUsers || [];
  const roles: Role[] = rawRoles ? rawRoles.filter((r: any) => r.isActive) : [];
  const loading = loadingUsers;

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    customRoleId: "",
  });

  const fetchUsers = async () => {
    await mutateUsers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        customRoleId: formData.customRoleId || null,
      };

      // Only include password for new users or if it's being changed
      if (!editingUser || formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchUsers();
        setIsSheetOpen(false);
        resetForm();
        toast.success(editingUser ? "User updated successfully" : "User added successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${editingUser ? "update" : "add"} user`);
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(`Failed to ${editingUser ? "update" : "add"} user`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;

    setDeletingId(idToDelete);
    try {
      const response = await fetch(`/api/users/${idToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
        toast.success("User deactivated successfully");
        setIsDeleteDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to deactivate user");
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error("Failed to deactivate user");
    } finally {
      setDeletingId(null);
      if (!idToDelete) setIdToDelete(null);
    }
  };

  const router = useRouter();

  const handleEdit = (user: User) => {
    router.push(`/dashboard/users/${user._id}`);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      customRoleId: "",
    });
  };

  const getRoleBadge = (user: User) => {
    if (user.role === "company_admin") {
      return <Badge variant="default">Company Admin</Badge>;
    }
    if (user.customRoleId) {
      return <Badge variant="secondary">{user.customRoleId.name}</Badge>;
    }
    return <Badge variant="outline">No Role</Badge>;
  };

  const getRoleLabel = (user: User) => {
    if (user.role === "company_admin") return "Company Admin";
    if (user.customRoleId?.name) return user.customRoleId.name;
    return "No Role";
  };

  const handleSort = (column: SortColumn) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevColumn;
      }
      // Ratings are most useful high → low on first click.
      setSortDirection(column === "averageRating" ? "desc" : "asc");
      return column;
    });
  };

  const sortedUsers = useMemo(() => {
    const items = [...users];
    items.sort((a, b) => {
      if (sortColumn === "averageRating") {
        const isTechA = a.role === "company_user" || a.role === "employee";
        const isTechB = b.role === "company_user" || b.role === "employee";
        const reviewsA = Number(a.totalReviews || 0);
        const reviewsB = Number(b.totalReviews || 0);

        // Keep technician rows ahead of non-technician rows for rating sort.
        if (isTechA !== isTechB) return isTechA ? -1 : 1;

        // Among technicians, reviewed users should appear before "No reviews".
        const hasReviewsA = reviewsA > 0;
        const hasReviewsB = reviewsB > 0;
        if (hasReviewsA !== hasReviewsB) return hasReviewsA ? -1 : 1;

        // If neither has reviews, stabilize with name.
        if (!hasReviewsA && !hasReviewsB) {
          const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
          const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        }

        const avgA = Number(a.averageRating || 0);
        const avgB = Number(b.averageRating || 0);
        if (avgA < avgB) return sortDirection === "asc" ? -1 : 1;
        if (avgA > avgB) return sortDirection === "asc" ? 1 : -1;

        // Tie-breaker: more reviews first, then name.
        if (reviewsA !== reviewsB) return reviewsB - reviewsA;
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }

      let left: string | number = "";
      let right: string | number = "";

      switch (sortColumn) {
        case "name":
          left = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
          right = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
          break;
        case "email":
          left = (a.email || "").toLowerCase();
          right = (b.email || "").toLowerCase();
          break;
        case "role":
          left = getRoleLabel(a).toLowerCase();
          right = getRoleLabel(b).toLowerCase();
          break;
        case "status":
          left = a.isActive ? 1 : 0;
          right = b.isActive ? 1 : 0;
          break;
        case "joined":
          left = new Date(a.createdAt).getTime();
          right = new Date(b.createdAt).getTime();
          break;
      }

      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [users, sortColumn, sortDirection]);

  const renderSortHead = (label: string, column: SortColumn) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => handleSort(column)}
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3.5 w-3.5 ${sortColumn === column ? "text-foreground" : "text-muted-foreground"}`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsSheetOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Create User Sheet (replaces modal) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b gap-0">
            <SheetTitle>{editingUser ? "Edit User" : "Add New User"}</SheetTitle>
            <SheetDescription>
              {editingUser ? "Update user information and role" : "Add a new team member to your company"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password {!editingUser && "*"}</Label>
                <Input
                  id="password"
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "Leave blank to keep current password" : ""}
                />
                {editingUser && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep current password
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customRoleId">Role</Label>
                <Select
                  value={formData.customRoleId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customRoleId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role (optional)" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="z-[100]">
                    <SelectItem value="none">No Role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role._id} value={role._id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign a role to grant specific permissions
                </p>
              </div>
            </form>
          </div>

          <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? "Update User" : "Add User"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{renderSortHead("Name", "name")}</TableHead>
                <TableHead>{renderSortHead("Email", "email")}</TableHead>
                <TableHead>{renderSortHead("Role", "role")}</TableHead>
                <TableHead>{renderSortHead("Avg Rating", "averageRating")}</TableHead>
                <TableHead>{renderSortHead("Status", "status")}</TableHead>
                <TableHead>{renderSortHead("Joined", "joined")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No team members found. Add your first team member to get
                        started.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.isActive ? (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <UserX className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user)}</TableCell>
                    <TableCell>
                      {user.role === "company_user" || user.role === "employee" ? (
                        (user.totalReviews || 0) > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3.5 w-3.5 ${
                                    (user.averageRating || 0) >= star
                                      ? "fill-primary text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {(user.averageRating || 0).toFixed(1)} ({user.totalReviews})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No reviews</span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.isActive ? (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {user.isVerified && (
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.role !== "company_admin" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user._id)}
                              disabled={deletingId === user._id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {user.role === "company_admin" && (
                          <Badge variant="outline" className="text-xs">
                            Admin
                          </Badge>
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


      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this user? They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setIdToDelete(null);
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
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
