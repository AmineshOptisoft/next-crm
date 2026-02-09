"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Single app card
const appInfo = {
  name: "Booking Crm",
  logo: "BC",
  plan: "Booking Crm",
};

const menuItems = {
  general: [
    {
      title: "Dashboard",
      href: "/dashboard",
      module: "dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },

    {
      title: "Tasks",
      href: "/dashboard/tasks",
      module: "tasks",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      title: "Contacts",
      href: "/dashboard/contacts",
      module: "contacts",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 21a8 8 0 1 0-12 0" />
          <circle cx="12" cy="11" r="4" />
        </svg>
      ),
    },
    {
      title: "Deals",
      href: "/dashboard/deals",
      module: "deals",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10h18" />
          <path d="M3 6h18" />
          <path d="M3 14h18" />
          <path d="M3 18h18" />
        </svg>
      ),
    },
    {
      title: "Products",
      href: "/dashboard/products",
      module: "products",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },

    {
      title: "Appointments",
      href: "/dashboard/appointments",
      module: "appointments",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      title: "Invoices",
      href: "/dashboard/invoices",
      module: "invoices",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      title: "Meetings",
      href: "/dashboard/meetings",
      module: "meetings",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      title: "Activities",
      href: "/dashboard/activities",
      module: "activities",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      title: "Email Builder",
      href: "/dashboard/email-builder",
      module: "email-builder",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.2 8.4c.5.5.8 1.2.8 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c.8 0 1.5.3 2 .8l5.2 5.6Z" />
          <path d="M16 2v4c0 1.1.9 2 2 2h4" />
          <path d="M9 13h6" />
          <path d="M9 17h3" />
        </svg>
      ),
    },
  ],
  admin: [
    {
      title: "Roles",
      href: "/dashboard/roles",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      title: "Services",
      href: "/dashboard/services",
      module: "services",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 7h10" />
          <path d="M7 12h10" />
          <path d="M7 17h10" />
        </svg>
      ),
    },
    {
      title: "Users",
      href: "/dashboard/users",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Industries",
      href: "/dashboard/industries",
      superAdminOnly: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 12V8H4v4" />
          <path d="M4 16v-4h16v4" />
          <path d="M4 8l4-4h8l4 4" />
          <path d="M8 20h8" />
        </svg>
      ),
    },
    {
      title: "Companies",
      href: "/dashboard/companies",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M9 8h1" />
          <path d="M9 12h1" />
          <path d="M9 16h1" />
          <path d="M14 8h1" />
          <path d="M14 12h1" />
          <path d="M14 16h1" />
          <path d="M6 3v18" />
          <path d="M18 3v18" />
          <path d="M6 3h12" />
        </svg>
      ),
    },
    {
      title: "Company Settings",
      href: "/dashboard/company-settings",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M9 8h1" />
          <path d="M9 12h1" />
          <path d="M9 16h1" />
          <path d="M14 8h1" />
          <path d="M14 12h1" />
          <path d="M14 16h1" />
          <path d="M6 3v18" />
          <path d="M18 3v18" />
          <path d="M6 3h12" />
        </svg>
      ),
    },
  ],
  other: [
    {
      title: "Settings",
      href: "/dashboard/settings/account",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      hasChevron: true,
    },
  ],
};

type MeUser = {
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  permissions?: any[];
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean>(true); // Default true to avoid flicker

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setMe(data.user ?? null);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Check profile completion status
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/company/settings", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setProfileCompleted(data.profileCompleted ?? false);
      } catch {
        // ignore - default to complete to avoid blocking
      }
    })();
  }, []);

  const displayName =
    me && (me.firstName || me.lastName)
      ? [me.firstName, me.lastName].filter(Boolean).join(" ")
      : me?.email || "User";

  const initials = (displayName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      window.location.href = "/login";
    } catch {
      // ignore
    }
  }

  // Check if user has permission to view a module
  const hasModulePermission = (module: string): boolean => {
    if (!me) {
      return false;
    }


    // Super admin and company admin have access to all modules
    if (me.role === "super_admin" || me.role === "company_admin") {
      return true;
    }

    // Company user, employee, and contact - check permissions
    if ((me.role === "company_user" || me.role === "employee" || me.role === "contact") && me.permissions) {
      const permission = me.permissions.find((p: any) => p.module === module);
      const hasPermission = permission?.canView === true;
      return hasPermission;
    }

    return false;
  };

  // Filter menu items based on permissions
  const filteredGeneralItems = menuItems.general.filter((item) =>
    hasModulePermission(item.module)
  );

  const filteredAdminItems = menuItems.admin.filter((item: any) => {
    if (item.superAdminOnly && me?.role !== "super_admin") return false;
    return true;
  });

  return (
    <Sidebar>
      {/* Fixed app card */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-xs font-semibold">{appInfo.logo}</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{appInfo.name}</span>
                <span className="truncate text-xs">{appInfo.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto opacity-0" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredGeneralItems.map((item) => {
                // Check if this item should be disabled
                const isDisabled = !profileCompleted && item.module !== 'company-settings';

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className={isDisabled ? 'opacity-40 pointer-events-none' : ''}
                    >
                      <Link href={item.href}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration section - only for super_admin and company_admin */}
        {me?.role && (me.role === "super_admin" || me.role === "company_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.other.map((item) => {
                // Disable Other items if profile incomplete
                const isDisabled = !profileCompleted;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith("/dashboard/settings")}
                      className={isDisabled ? 'opacity-40 pointer-events-none' : ''}
                    >
                      <Link href={item.href}>
                        {item.icon}
                        <span>{item.title}</span>
                        {item.hasChevron && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ml-auto"
                          >
                            <path d="m 9 18 6-6-6-6" />
                          </svg>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: logged-in user */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={me?.avatarUrl} alt={displayName} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>
                    <span className="truncate text-xs">
                      {me?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={me?.avatarUrl} alt={displayName} />
                      <AvatarFallback className="rounded-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {displayName}
                      </span>
                      <span className="truncate text-xs">
                        {me?.email || "user@example.com"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings/account")}
                >
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings/account")}
                >
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
