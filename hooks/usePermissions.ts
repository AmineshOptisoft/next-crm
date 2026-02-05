"use client";

import { useEffect, useState } from "react";

interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface User {
  role: string;
  permissions?: Permission[];
}

interface UserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canView: boolean;
  isLoading: boolean;
}

/**
 * Hook to check user permissions for a specific module
 * @param module - The module name (e.g., "tasks", "contacts", "deals")
 * @returns Object with permission flags and loading state
 */
export function usePermissions(module: string): UserPermissions {
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    canView: false,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setPermissions({
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canExport: false,
            canView: false,
            isLoading: false,
          });
          return;
        }

        const data = await res.json();
        const user: User = data.user;

        // Super admin and company admin have all permissions
        if (user?.role === "super_admin" || user?.role === "company_admin") {
          setPermissions({
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canExport: true,
            canView: true,
            isLoading: false,
          });
          return;
        }

        // For other roles, check specific permissions
        if (user?.permissions) {
          const permission = user.permissions.find((p) => p.module === module);
          if (permission) {
            setPermissions({
              canCreate: permission.canCreate,
              canEdit: permission.canEdit,
              canDelete: permission.canDelete,
              canExport: permission.canExport,
              canView: permission.canView,
              isLoading: false,
            });
            return;
          }
        }

        // No permissions found
        setPermissions({
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canExport: false,
          canView: false,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions({
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canExport: false,
          canView: false,
          isLoading: false,
        });
      }
    }

    fetchPermissions();
  }, [module]);

  return permissions;
}
