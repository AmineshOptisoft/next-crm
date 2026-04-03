"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Laptop2, Moon, SunMedium } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
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
import { normalizeAvatarUrl } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

type ClientBookingTopbarProps = {
  /** Current public site subdomain — used for Book Now and login/register links */
  subdomain?: string;
  /** Optional brand logo shown on left side */
  companyLogo?: string;
  /** Optional brand name shown on left side */
  companyName?: string;
  /** Hide Book Now button when needed (e.g. already on booking page) */
  hideBookNow?: boolean;
};

/**
 * Same header as `/dashboard/client-bookings` (layout): GF brand, theme, Book Now, account menu.
 * On the public booking page, guests still see Login / Register.
 */
export function ClientBookingTopbar({
  subdomain,
  companyLogo,
  companyName,
  hideBookNow = false,
}: ClientBookingTopbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [savingTheme, setSavingTheme] = useState(false);

  const { data: meData } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const { data: settingsData } = useSWR(
    meData?.user ? "/api/company/settings" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const bookNowHref = useMemo(() => {
    const sub =
      (typeof subdomain === "string" && subdomain.trim().toLowerCase()) ||
      (() => {
        const s = settingsData as
          | { subdomain?: string; publicSites?: Array<{ subdomain?: string }> }
          | undefined;
        if (!s) return "";
        const primary = typeof s.subdomain === "string" ? s.subdomain.trim().toLowerCase() : "";
        if (primary) return primary;
        const sites = Array.isArray(s.publicSites) ? s.publicSites : [];
        const fromSite = sites.find((x) => x?.subdomain)?.subdomain;
        return typeof fromSite === "string" ? fromSite.trim().toLowerCase() : "";
      })();
    return sub ? `/site/${sub}?clientBooking=1` : null;
  }, [subdomain, settingsData]);

  const user = meData?.user;
  const isContact = user?.role === "contact";

  const displayName =
    user && (user.firstName || user.lastName)
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : user?.email || "User";

  const initials = (displayName || "User")
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarUrl = useMemo(
    () => normalizeAvatarUrl(typeof user?.avatarUrl === "string" ? user.avatarUrl : ""),
    [user?.avatarUrl]
  );

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
    const previousTheme = (theme as "light" | "dark" | "system" | undefined) || "system";
    setTheme(nextTheme);
    if (!user) return;
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
      }
    } catch {
      setTheme(previousTheme);
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

  const loginHref = subdomain
    ? `/login?subdomain=${encodeURIComponent(subdomain)}`
    : "/login";
  const registerHref = subdomain
    ? `/register?subdomain=${encodeURIComponent(subdomain)}`
    : "/register";
  const brandName = (companyName || (settingsData as any)?.name || "Green Frog").trim();
  const brandLogo = String(companyLogo || "").trim();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
        <Link href="/dashboard/client-bookings" className="flex items-center gap-2">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName || "Company logo"}
              className="h-8 w-8 rounded-full object-cover border"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {(brandName || "GF").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm font-semibold">{brandName}</p>
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

          {!hideBookNow &&
            (bookNowHref ? (
              <Button size="sm" className="rounded-full px-5" asChild>
                <Link href={bookNowHref}>Book Now</Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="rounded-full px-5"
                type="button"
                disabled
                title="Booking link unavailable"
              >
                Book Now
              </Button>
            ))}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2" type="button">
                  <Avatar key={avatarUrl || "none"} className="h-7 w-7">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:block">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isContact ? (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/client-bookings")}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link href={loginHref}>Login</Link>
              </Button>
              <Button size="sm" className="rounded-full" asChild>
                <Link href={registerHref}>Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
