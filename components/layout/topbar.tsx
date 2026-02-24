"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import useSWR from "swr";
const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(res => res.json());

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Moon,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronRight,
  SunMedium,
  Laptop2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/contacts": "Contacts",
  "/dashboard/deals": "Deals",
  "/dashboard/employees": "Employees",
  "/dashboard/tasks": "Tasks",
};

type MeResponse = {
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  } | null;
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [openCmd, setOpenCmd] = useState(false);

  const title =
    Object.entries(titleMap).find(([key]) => pathname.startsWith(key))?.[1] ||
    "Dashboard";

  const { data: meData } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  useEffect(() => {
    if (meData?.user) {
      const data = meData as MeResponse;
      if (data.user) {
        const fullName =
          data.user.firstName && data.user.lastName
            ? `${data.user.firstName} ${data.user.lastName}`
            : data.user.firstName || data.user.email;

        setUserName(fullName);
        setUserEmail(data.user.email);
        setAvatarUrl(data.user.avatarUrl);
      }
    }
  }, [meData]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCmd((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const initials = (userName || userEmail || "User")
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
      // optional toast
    }
  }

  const go = useCallback(
    (path: string) => {
      setOpenCmd(false);
      router.push(path);
    },
    [router]
  );

  const themeIcon =
    theme === "light" ? (
      <SunMedium className="h-4 w-4" />
    ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Laptop2 className="h-4 w-4" />
    );

  return (
    <>
      {/* Top navigation bar */}
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: sidebar trigger + title */}
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>

        {/* Center: search that opens command palette */}
        {/* Center: search that opens command palette */}
        <div className="flex flex-1 justify-end md:justify-center px-2 md:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setOpenCmd(true)}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>

          <button
            type="button"
            onClick={() => setOpenCmd(true)}
            className="hidden md:flex relative h-9 w-full max-w-md items-center rounded-md border bg-muted text-sm text-muted-foreground px-3 pl-8 pr-14 hover:bg-accent/50"
          >
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <span className="truncate text-left">Search</span>
            <span className="pointer-events-none absolute right-2 inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Kbd className="h-4">⌘</Kbd>
              <Kbd className="h-4">K</Kbd>
            </span>
          </button>
        </div>

        {/* Right: theme, settings, user menu */}
        <div className="flex items-center gap-3">
          {/* Theme toggle / menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                {themeIcon}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <SunMedium className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop2 className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => router.push("/dashboard/settings")}
          >
            <Settings className="h-4 w-4" />
          </Button> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-full px-2 pr-3"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">
                  {userName || "User"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {userName || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {userEmail || "user@example.com"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings/account")}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings/appearance")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Appearance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Command palette */}
      <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="General">
            <CommandItem onSelect={() => go("/dashboard")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/employees")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Employees</span>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/tasks")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Tasks</span>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/contacts")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Contacts</span>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/deals")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Deals</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => go("/dashboard/settings/account")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Account</span>
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/settings/appearance")}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Appearance</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
