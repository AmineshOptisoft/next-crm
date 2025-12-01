// app/dashboard/layout.tsx
"use client"
import dynamic from "next/dynamic";
import { SidebarProvider } from "@/components/ui/sidebar";

const AppSidebar = dynamic(() => import("@/components/app-sidebar").then(m => m.AppSidebar), {
  ssr: false,
});

const Topbar = dynamic(() => import("@/components/layout/topbar").then(m => m.Topbar), {
  ssr: false,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <Topbar />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
