"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useLayoutPreferences } from "@/components/theme-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function SettingsAppearance() {
  const { theme, setTheme } = useTheme();
  const { compact, setCompact } = useLayoutPreferences();
  const [savingTheme, setSavingTheme] = useState(false);

  async function handleThemeChange(value: string) {
    const nextTheme = value as "light" | "dark" | "system";
    const previousTheme = (theme as "light" | "dark" | "system" | undefined) || "system";

    setTheme(nextTheme);
    setSavingTheme(true);

    try {
      const res = await fetch("/api/settings/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ theme: nextTheme }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTheme(previousTheme);
        toast.error(data.error || "Failed to save theme");
        return;
      }
    } catch {
      setTheme(previousTheme);
      toast.error("Failed to save theme");
    } finally {
      setSavingTheme(false);
    }
  }

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <Label>Theme</Label>
          <Select
            value={theme || "system"}
            onValueChange={handleThemeChange}
            disabled={savingTheme}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

     
      </CardContent>
    </Card>
  );
}
