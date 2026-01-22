"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

interface ProtectedPageProps {
  children: React.ReactNode;
  module: string;
  requiredPermission?: "view" | "create" | "edit" | "delete" | "export";
}

/**
 * Component to protect pages based on user permissions
 * Redirects to dashboard if user doesn't have required permission
 */
export function ProtectedPage({
  children,
  module,
  requiredPermission = "view",
}: ProtectedPageProps) {
  const router = useRouter();
  const { hasPermission, isLoading } = usePermissions();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const authorized = hasPermission(module, requiredPermission);
      setIsAuthorized(authorized);

      if (!authorized) {
        // Redirect to dashboard if not authorized
        router.push("/dashboard");
      }
    }
  }, [isLoading, module, requiredPermission, hasPermission, router]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authorized (will redirect)
  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
