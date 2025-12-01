"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Shield,
  Palette,
  Bell,
  Monitor,
} from "lucide-react";

export function SettingsSidebar() {
  return (
    <div className="w-64 shrink-0">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage your account settings and set e‑mail preferences.
      </p>

      {/* Local Settings submenu inside Tabs */}
      <TabsList className="flex w-full flex-col items-stretch gap-1 bg-transparent p-0">
        <TabsTrigger
          value="profile"
          className="justify-start gap-2 rounded-md px-3 py-2 text-sm data-[state=active]:bg-muted"
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
        </TabsTrigger>

        <TabsTrigger
          value="account"
          className="justify-start gap-2 rounded-md px-3 py-2 text-sm data-[state=active]:bg-muted"
        >
          <Shield className="h-4 w-4" />
          <span>Account</span>
        </TabsTrigger>

        <TabsTrigger
          value="appearance"
          className="justify-start gap-2 rounded-md px-3 py-2 text-sm data-[state=active]:bg-muted"
        >
          <Palette className="h-4 w-4" />
          <span>Appearance</span>
        </TabsTrigger>

        <TabsTrigger
          value="notifications"
          className="justify-start gap-2 rounded-md px-3 py-2 text-sm data-[state=active]:bg-muted"
        >
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
        </TabsTrigger>

        <TabsTrigger
          value="display"
          className="justify-start gap-2 rounded-md px-3 py-2 text-sm data-[state=active]:bg-muted"
        >
          <Monitor className="h-4 w-4" />
          <span>Display</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
