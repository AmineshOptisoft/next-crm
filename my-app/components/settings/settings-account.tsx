"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type MeUser = {
  firstName?: string;
  lastName?: string;
  email: string;
  companyName?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
};

export function SettingsAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      companyName: formData.get("companyName"),
      countryId: formData.get("countryId"),
      stateId: formData.get("stateId"),
      cityId: formData.get("cityId"),
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    };

    setSaving(true);
    const res = await fetch("/api/settings/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      // TODO: show toast from response.error
      return;
    }

    // Optionally refetch /api/auth/me or show success toast
  }

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading account...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Update your profile information, company details, and password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Name */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={user.firstName || ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={user.lastName || ""}
              />
            </div>
          </div>

          <Separator />

          {/* Contact */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
            />
          </div>

          <Separator />

          {/* Company + location */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company</Label>
              <Input
                id="companyName"
                name="companyName"
                defaultValue={user.companyName || ""}
                placeholder="Company name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="countryId">Country</Label>
                <Input
                  id="countryId"
                  name="countryId"
                  defaultValue={user.countryId || ""}
                  placeholder="Country ID"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stateId">State</Label>
                <Input
                  id="stateId"
                  name="stateId"
                  defaultValue={user.stateId || ""}
                  placeholder="State ID"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cityId">City</Label>
                <Input
                  id="cityId"
                  name="cityId"
                  defaultValue={user.cityId || ""}
                  placeholder="City ID"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Password */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="destructive">
            Delete account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
