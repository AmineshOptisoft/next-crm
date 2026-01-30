"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLayoutPreferences } from "@/components/theme-provider";

export function SettingsDisplay() {
  const { showAvatars, setShowAvatars, tableDensity, setTableDensity } =
    useLayoutPreferences();

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Display</CardTitle>
        <CardDescription>
          Control how data is displayed in tables and cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <Label>Default table density</Label>
          <Select
            value={tableDensity}
            onValueChange={(value) =>
              setTableDensity(value as "comfortable" | "compact" | "spacious")
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-0.5">
            <Label>Show avatars</Label>
            <p className="text-xs text-muted-foreground">
              Display user avatars in tables and lists.
            </p>
          </div>
          <Switch checked={showAvatars} onCheckedChange={setShowAvatars} />
        </div>
      </CardContent>
    </Card>
  );
}
