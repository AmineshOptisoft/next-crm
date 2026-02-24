// app/dashboard/layout.tsx
"use client"
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

// Pages that are always accessible even when profile is incomplete
const ALWAYS_ACCESSIBLE = ["/dashboard/company-settings"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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

  // Derived values (safe with nullish defaults)
  const userRole = meData?.user?.role ?? "";
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "company_admin";
  const profileCompleted: boolean = settingsData?.profileCompleted ?? true;
  const isProfileIncomplete = !profileCompleted;

  // Guard: redirect to company-settings if profile not done
  useEffect(() => {
    if (isLoading) return;
    if (isSuperAdmin) return;              // super admins are never blocked
    if (isOnSettingsPage) return;          // already on the page they need to be on
    if (isProfileIncomplete) {
      router.replace("/dashboard/company-settings");
    }
  }, [isLoading, isSuperAdmin, isOnSettingsPage, isProfileIncomplete, router]);

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
        <main className="flex-1 overflow-auto w-full max-w-full p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
