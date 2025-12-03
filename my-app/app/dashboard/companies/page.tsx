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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Eye, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Company {
  _id: string;
  name: string;
  adminId: {
    firstName: string;
    lastName: string;
    email: string;
  };
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  plan: string;
  planExpiry?: string;
  limits: {
    users: number;
    contacts: number;
    deals: number;
  };
  isActive: boolean;
  createdAt: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
        setError(null);
      } else if (response.status === 403) {
        setError("You don't have permission to view companies. Super Admin access required.");
      } else {
        setError("Failed to load companies");
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      setError("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      free: "outline",
      starter: "secondary",
      professional: "default",
      enterprise: "default",
    };
    return (
      <Badge variant={variants[plan] || "outline"} className="capitalize">
        {plan}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            View and manage all companies on the platform
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            View and manage all companies on the platform
          </p>
        </div>
        <Badge variant="default" className="text-sm">
          Super Admin View
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter((c) => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Plan</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter((c) => c.plan === "free").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Plans</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter((c) => c.plan !== "free").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading companies...</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No companies found.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        {company.industry && (
                          <div className="text-sm text-muted-foreground">
                            {company.industry}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {company.adminId.firstName} {company.adminId.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {company.adminId.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(company.plan)}</TableCell>
                    <TableCell>
                      {company.isActive ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(company.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewCompany(company)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Company Dialog */}
      <Dialog open={!!viewCompany} onOpenChange={() => setViewCompany(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCompany?.name}</DialogTitle>
            <DialogDescription>Company Details</DialogDescription>
          </DialogHeader>
          {viewCompany && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Company Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">{viewCompany.name}</span>
                    </div>
                    {viewCompany.industry && (
                      <div>
                        <span className="text-muted-foreground">Industry:</span>{" "}
                        <span className="font-medium">{viewCompany.industry}</span>
                      </div>
                    )}
                    {viewCompany.website && (
                      <div>
                        <span className="text-muted-foreground">Website:</span>{" "}
                        <a
                          href={viewCompany.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {viewCompany.website}
                        </a>
                      </div>
                    )}
                    {viewCompany.email && (
                      <div>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        <span className="font-medium">{viewCompany.email}</span>
                      </div>
                    )}
                    {viewCompany.phone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        <span className="font-medium">{viewCompany.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Administrator</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">
                        {viewCompany.adminId.firstName}{" "}
                        {viewCompany.adminId.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <span className="font-medium">
                        {viewCompany.adminId.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Subscription</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Plan:</span>{" "}
                      {getPlanBadge(viewCompany.plan)}
                    </div>
                    {viewCompany.planExpiry && (
                      <div>
                        <span className="text-muted-foreground">Expires:</span>{" "}
                        <span className="font-medium">
                          {new Date(viewCompany.planExpiry).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Limits</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Users:</span>{" "}
                      <span className="font-medium">
                        {viewCompany.limits.users}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contacts:</span>{" "}
                      <span className="font-medium">
                        {viewCompany.limits.contacts}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deals:</span>{" "}
                      <span className="font-medium">
                        {viewCompany.limits.deals}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <div className="flex gap-2">
                  {viewCompany.isActive ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created {new Date(viewCompany.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>

              {viewCompany.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewCompany.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
