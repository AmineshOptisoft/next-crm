"use client"

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Bell,
  Palette,
  Wrench,
  UserCog,
} from "lucide-react";

const sidebarNavItems = [
 
  {
    title: "Account",
    href: "/dashboard/settings/account",
    icon: Wrench,
  },
  {
    title: "Appearance",
    href: "/dashboard/settings/appearance",
    icon: Palette,
  },
  {
    title: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Bell,
  },
  {
    title: "Display",
    href: "/dashboard/settings/display",
    icon: Monitor,
  },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {sidebarNavItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col space-y-0 px-6 py-4 lg:px-8">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>

      <Separator className="my-4 lg:my-6" />

      <div className="flex flex-1 flex-col space-y-2 overflow-hidden lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="top-0 lg:sticky lg:w-1/5">
          <SidebarNav />
        </aside>

        <div className="flex w-full overflow-y-auto p-1">
          <div className="w-full max-w-3xl space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
