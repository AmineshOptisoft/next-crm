// app/dashboard/layout.tsx
"use client"
import { useEffect, useMemo, useState } from "react";
import { normalizeAvatarUrl } from "@/lib/utils";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, SunMedium, Laptop2 } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

// Pages that are always accessible even when profile is incomplete
const ALWAYS_ACCESSIBLE = ["/dashboard/company-settings"];
const ADMIN_ONLY_ROUTES = [
  "/dashboard/company-settings",
  "/dashboard/roles",
  "/dashboard/users",
  "/dashboard/services",
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [savingTheme, setSavingTheme] = useState(false);

  // Both fetches share the global SWR cache — other components reuse these without extra calls
  const { data: meData, isLoading: loadingMe } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const { data: settingsData, isLoading: loadingSettings } = useSWR(
    "/api/company/settings",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const isLoading = loadingMe || loadingSettings;
  const isOnSettingsPage = ALWAYS_ACCESSIBLE.some((p) => pathname.startsWith(p));
  const isClientBookingsPage = pathname.startsWith("/dashboard/client-bookings");
  const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.some((p) => pathname.startsWith(p));

  // Derived values (safe with nullish defaults)
  const userRole = meData?.user?.role ?? "";
  const isSuperAdmin = userRole === "super_admin";
  const isCompanyAdmin = userRole === "company_admin";
  
  let profileCompleted = true; // default true
  if (meData?.user?.companyId?.profileCompleted !== undefined) {
    profileCompleted = meData.user.companyId.profileCompleted;
  } else if (settingsData?.profileCompleted !== undefined) {
    profileCompleted = settingsData.profileCompleted;
  }
  
  const isProfileIncomplete = !isSuperAdmin && !profileCompleted;

  // Guard: redirect to company-settings if profile not done
  useEffect(() => {
    if (isLoading) return;
    if (!meData?.user) {
      router.replace("/login");
      return;
    }
    if (isAdminOnlyRoute && !isSuperAdmin && !isCompanyAdmin) {
      router.replace("/dashboard");
      return;
    }
    if (isSuperAdmin) return;              // super admins are never blocked
    if (isOnSettingsPage) return;          // already on the page they need to be on
    if (isProfileIncomplete) {
      router.replace("/dashboard/company-settings");
    }
  }, [
    isLoading,
    meData?.user,
    isAdminOnlyRoute,
    isSuperAdmin,
    isCompanyAdmin,
    isOnSettingsPage,
    isProfileIncomplete,
    router,
  ]);

  // Must run before any conditional return — hooks order must be stable every render
  const clientBookNowHref = useMemo(() => {
    const s = settingsData as
      | { subdomain?: string; publicSites?: Array<{ subdomain?: string }> }
      | undefined;
    if (!s) return null;
    const primary = typeof s.subdomain === "string" ? s.subdomain.trim().toLowerCase() : "";
    if (primary) return `/site/${primary}?clientBooking=1`;
    const sites = Array.isArray(s.publicSites) ? s.publicSites : [];
    const fromSite = sites.find((x) => x?.subdomain)?.subdomain;
    const sub = typeof fromSite === "string" ? fromSite.trim().toLowerCase() : "";
    return sub ? `/site/${sub}?clientBooking=1` : null;
  }, [settingsData]);

  const topbarAvatarUrl = useMemo(
    () => normalizeAvatarUrl(meData?.user?.avatarUrl),
    [meData?.user?.avatarUrl]
  );

  // Show loading spinner only for first load and only if NOT on settings page
  if (isLoading && !isOnSettingsPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const displayName =
    meData?.user && (meData.user.firstName || meData.user.lastName)
      ? [meData.user.firstName, meData.user.lastName].filter(Boolean).join(" ")
      : meData?.user?.email || "User";

  const initials = (displayName || "User")
    .split(" ")
    .map((part: string) => part[0])
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

  async function handleThemeChange(nextTheme: "light" | "dark" | "system") {
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
        toast.error(data.error || "Failed to save theme");
        return;
      }
      // Apply exactly once after persistence to avoid visual bounce.
      setTheme(nextTheme);
    } catch {
      toast.error("Failed to save theme");
    } finally {
      setSavingTheme(false);
    }
  }

  const themeIcon =
    theme === "light" ? (
      <SunMedium className="h-4 w-4" />
    ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Laptop2 className="h-4 w-4" />
    );

  if (isClientBookingsPage) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/dashboard/client-bookings" className="flex items-center gap-2">
              {settingsData?.logo ? (
                <img
                  src={settingsData.logo}
                  alt={settingsData?.name || "Company logo"}
                  className="h-8 w-8 rounded-full object-cover border"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {(settingsData?.name || "GF").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="leading-tight hidden md:block">
                <p className="text-sm font-semibold">{settingsData?.name || "Green Frog"}</p>
                <p className="text-[11px] text-muted-foreground">Cleaning</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" type="button">
                    {themeIcon}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={savingTheme}
                    onClick={() => handleThemeChange("light")}
                  >
                    <SunMedium className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={savingTheme}
                    onClick={() => handleThemeChange("dark")}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={savingTheme}
                    onClick={() => handleThemeChange("system")}
                  >
                    <Laptop2 className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {clientBookNowHref ? (
                <Button size="sm" className="rounded-full px-5" asChild>
                  <Link href={clientBookNowHref}>Book Now</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full px-5"
                  type="button"
                  disabled
                  title="Set a public site subdomain in company settings to enable booking"
                >
                  Book Now
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 px-2">
                    <Avatar key={topbarAvatarUrl || "none"} className="h-7 w-7">
                      {topbarAvatarUrl ? (
                        <AvatarImage src={topbarAvatarUrl} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm sm:block">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push("/dashboard/client-bookings")}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="w-full max-w-full min-w-0 overflow-x-hidden p-4">{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur w-full">
          <div className="border-b">
            <Topbar />
          </div>

          {/* Global warning banner — shown on ALL pages when profile is incomplete */}
          {isProfileIncomplete && !isSuperAdmin && (
            <div className="w-full bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-300">Complete Your Company Profile</h5>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    Please fill all required fields marked with{" "}
                    <span className="text-red-500 font-bold">*</span> in Company Settings to unlock all features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </header>
        <main className="w-full max-w-full min-w-0 overflow-x-hidden p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
