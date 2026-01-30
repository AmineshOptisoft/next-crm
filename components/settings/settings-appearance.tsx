"use client";

import { useTheme } from "next-themes";
import { useLayoutPreferences } from "@/components/theme-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function SettingsAppearance() {
  const { theme, setTheme } = useTheme();
  const { compact, setCompact } = useLayoutPreferences();

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
            onValueChange={(value: string) =>
              setTheme(value as "light" | "dark" | "system")
            }
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
