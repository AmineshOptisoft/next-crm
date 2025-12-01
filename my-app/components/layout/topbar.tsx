"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/contacts": "Contacts",
  "/dashboard/deals": "Deals",
};

export function Topbar() {
  const pathname = usePathname();
  const title =
    Object.entries(titleMap).find(([key]) => pathname.startsWith(key))?.[1] ||
    "Dashboard";

  return (
    <div className="flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search..."
          className="h-9 w-64 max-w-sm bg-muted text-sm"
        />
        <Avatar className="h-8 w-8">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
