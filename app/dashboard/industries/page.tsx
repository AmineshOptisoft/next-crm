"use client";

import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Tags } from "lucide-react";

type Industry = {
  _id: string;
  name: string;
  createdAt: string;
};

export default function IndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Industry | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchMe();
    fetchIndustries();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setMeRole(data?.user?.role ?? null);
    } catch {
      // ignore
    }
  };

  const fetchIndustries = async () => {
    try {
      const res = await fetch("/api/industries");
      if (res.ok) {
        const data = await res.json();
        setIndustries(data);
      }
    } catch (e) {
      console.error("Error fetching industries:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const url = editing ? `/api/industries/${editing._id}` : "/api/industries";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        await fetchIndustries();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save industry");
      }
    } catch (e) {
      console.error("Error saving industry:", e);
      alert("Failed to save industry");
    }
  };

  const handleEdit = (industry: Industry) => {
    setEditing(industry);
    setName(industry.name);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this industry?")) return;
    try {
      const res = await fetch(`/api/industries/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchIndustries();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete industry");
      }
    } catch (e) {
      console.error("Error deleting industry:", e);
      alert("Failed to delete industry");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Industries</h1>
          <p className="text-muted-foreground">
            Manage the industry dropdown options for your company profile
          </p>
        </div>

        {meRole === "super_admin" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Industry
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Industry" : "Add Industry"}
                </DialogTitle>
                <DialogDescription>
                  Industries appear in Company Settings → Company Profile.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="industryName">Name *</Label>
                    <Input
                      id="industryName"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Technology"
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
                  <Button type="submit">{editing ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {meRole !== null && meRole !== "super_admin" && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Only super admins can create/update/delete industries. You can still use
          the industry dropdown in Company Settings.
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading industries...</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {industries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Tags className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No industries yet. Add your first industry to enable the
                        dropdown.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                industries.map((industry) => (
                  <TableRow key={industry._id}>
                    <TableCell className="font-medium">{industry.name}</TableCell>
                    <TableCell>
                      {industry.createdAt
                        ? new Date(industry.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {meRole === "super_admin" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(industry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(industry._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

