"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

type MeUser = {
  firstName?: string;
  lastName?: string;
  email: string;
  companyName?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  avatarUrl?: string;
};

export function SettingsAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

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
        setAvatarUrl(data.user.avatarUrl || "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setAvatarUrl(data.url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

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
      avatarUrl: avatarUrl,
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
          {/* Profile Image */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt="Profile" />
                <AvatarFallback className="bg-muted">
                  <UserIcon className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-medium">Profile Image</h4>
              <p className="text-xs text-muted-foreground">
                Click the camera icon to upload a new profile image.
              </p>
            </div>
          </div>

          <Separator />

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
