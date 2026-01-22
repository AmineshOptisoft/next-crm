// app/dashboard/layout.tsx
"use client"
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const AppSidebar = dynamic(() => import("@/components/app-sidebar").then(m => m.AppSidebar), {
  ssr: false,
});

const Topbar = dynamic(() => import("@/components/layout/topbar").then(m => m.Topbar), {
  ssr: false,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      try {
        const response = await fetch("/api/company/settings");
        if (response.ok) {
          const company = await response.json();
          const incomplete = !company.profileCompleted;
          setIsProfileIncomplete(incomplete);

          // If profile not completed and NOT on settings page, redirect
          if (incomplete && pathname !== "/dashboard/company-settings") {
            router.replace("/dashboard/company-settings");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking profile completion:", error);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkProfileCompletion();
  }, [pathname, router]);

  // Show loading state while checking profile (only if NOT on settings page)
  if (isCheckingProfile && pathname !== "/dashboard/company-settings") {
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
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur w-full">
          <div className="border-b">
            <Topbar />
          </div>
          {/* Global Profile Warning - Visible on ALL pages if profile is incomplete */}
          {isProfileIncomplete && (
            <div className="w-full bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-300">Complete Your Profile</h5>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    Please fill all required fields marked with <span className="text-red-500 font-bold">*</span> in Company Settings to unlock all features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </SidebarProvider>
  );
}
