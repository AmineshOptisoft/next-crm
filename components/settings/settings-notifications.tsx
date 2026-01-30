"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsNotifications() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose how you want to be notified about activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-0.5">
            <Label>Email notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive updates about important changes by email.
            </p>
          </div>
          <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-0.5">
            <Label>Push notifications</Label>
            <p className="text-xs text-muted-foreground">
              Get real‑time alerts in your browser.
            </p>
          </div>
          <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-0.5">
            <Label>Weekly summary</Label>
            <p className="text-xs text-muted-foreground">
              Receive a weekly summary of activity and performance.
            </p>
          </div>
          <Switch
            checked={weeklySummary}
            onCheckedChange={setWeeklySummary}
          />
        </div>
      </CardContent>
    </Card>
  );
}
