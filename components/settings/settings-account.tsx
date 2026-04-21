"use client";

import { useEffect, useState } from "react";
import { Country, State, City } from "country-state-city";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

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

function normalizeCountryCode(rawCountry?: string): string {
  const value = (rawCountry ?? "").trim();
  if (!value) return "";

  const countries = Country.getAllCountries();
  const match = countries.find(
    (country) =>
      country.isoCode.toLowerCase() === value.toLowerCase() ||
      country.name.toLowerCase() === value.toLowerCase()
  );

  return match?.isoCode ?? "";
}

function normalizeStateCode(rawState: string | undefined, countryCode: string): string {
  const value = (rawState ?? "").trim();
  if (!value || !countryCode) return "";

  const states = State.getStatesOfCountry(countryCode);
  const match = states.find(
    (state) =>
      state.isoCode.toLowerCase() === value.toLowerCase() ||
      state.name.toLowerCase() === value.toLowerCase()
  );

  return match?.isoCode ?? "";
}

export function SettingsAccount() {
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [countryId, setCountryId] = useState<string>("");
  const [stateId, setStateId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const hydrateLocationFromUser = (nextUser?: MeUser | null) => {
    const normalizedCountry = normalizeCountryCode(nextUser?.countryId);
    const normalizedState = normalizeStateCode(nextUser?.stateId, normalizedCountry);
    setCountryId(normalizedCountry);
    setStateId(normalizedState);
    setCityId(nextUser?.cityId || "");
  };

  const clearError = (key: string) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validate = (
    form: HTMLFormElement,
    opts: { countryId: string; stateId: string; cityId: string; avatarUrl: string }
  ): Record<string, string> => {
    const next: Record<string, string> = {};
    const fd = new FormData(form);

    const firstName = (fd.get("firstName") ?? "").toString().trim();
    if (!firstName) next["firstName"] = "First name is required.";
    else if (firstName.length < 2) next["firstName"] = "First name must be at least 2 characters.";

    const lastName = (fd.get("lastName") ?? "").toString().trim();
    if (!lastName) next["lastName"] = "Last name is required.";
    else if (lastName.length < 2) next["lastName"] = "Last name must be at least 2 characters.";

    const email = (fd.get("email") ?? "").toString().trim();
    if (!email) next["email"] = "Email is required.";
    else if (!isValidEmail(email)) next["email"] = "Enter a valid email address.";

    return next;
  };

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
        setAvatarUrl(data.user?.avatarUrl || "");
        hydrateLocationFromUser(data.user);
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

    const nextErrors = validate(form, { countryId, stateId, cityId, avatarUrl });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstId = Object.keys(nextErrors)[0];
      document.getElementById(firstId)?.focus();
      return;
    }
    setErrors({});

    const body = {
      firstName: formData.get("firstName") ?? undefined,
      lastName: formData.get("lastName") ?? undefined,
      email: formData.get("email") ?? undefined,
      companyName: formData.get("companyName") ?? undefined,
      countryId: countryId || undefined,
      stateId: stateId || undefined,
      cityId: cityId || undefined,
      avatarUrl: avatarUrl || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to save profile");
        return;
      }

      toast.success("Profile updated successfully");
      mutate("/api/auth/me");
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
        setAvatarUrl(meData.user?.avatarUrl || "");
        hydrateLocationFromUser(meData.user);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading account...</p>;
  }

  const countries = Country.getAllCountries();
  const countryCode = countryId || undefined;
  const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
  const stateCode = stateId || undefined;
  const citiesFromLibrary =
    countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];
  const savedCity = (cityId ?? "").trim();
  const cityInList = citiesFromLibrary.some((c) => c.name === savedCity);
  const cities =
    savedCity && !cityInList
      ? [{ name: savedCity, stateCode: stateCode || "" }, ...citiesFromLibrary]
      : citiesFromLibrary;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="py-4">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Update your profile information and company details.
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
                className={errors.firstName ? "border-destructive" : ""}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
                onChange={() => clearError("firstName")}
              />
              {errors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {errors.firstName}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={user.lastName || ""}
                className={errors.lastName ? "border-destructive" : ""}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
                onChange={() => clearError("lastName")}
              />
              {errors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {errors.lastName}
                </p>
              )}
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
              className={errors.email ? "border-destructive" : ""}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              onChange={() => clearError("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
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
                <Select
                  value={countryId || "none"}
                  onValueChange={(val) => {
                    setCountryId(val === "none" ? "" : val);
                    setStateId("");
                    setCityId("");
                  }}
                >
                  <SelectTrigger id="countryId" className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select country</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c.isoCode} value={c.isoCode}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="stateId">State</Label>
                <Select
                  value={stateId || "none"}
                  onValueChange={(val) => {
                    setStateId(val === "none" ? "" : val);
                    setCityId("");
                  }}
                  disabled={!countryCode}
                >
                  <SelectTrigger id="stateId" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select state</SelectItem>
                    {states.map((s) => (
                      <SelectItem key={s.isoCode} value={s.isoCode}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cityId">City</Label>
                <Select
                  value={cityId || "none"}
                  onValueChange={(val) => setCityId(val === "none" ? "" : val)}
                  disabled={!stateCode}
                >
                  <SelectTrigger id="cityId" className="w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select city</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
