"use client";

import { useEffect, useState } from "react";

export type Permission = {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
};

export type UserRole = "super_admin" | "company_admin" | "company_user";

export type UserPermissions = {
  role: UserRole | null;
  permissions: Permission[];
  isLoading: boolean;
};

/**
 * Hook to check if user has permission for a specific module and action
 */
export function usePermissions(): UserPermissions & {
  hasPermission: (
    module: string,
    action: "view" | "create" | "edit" | "delete" | "export"
  ) => boolean;
  canAccessAdminPanel: () => boolean;
} {
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.user) {
          setRole(data.user.role || null);
          setPermissions(data.user.permissions || []);
        }
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  /**
   * Check if user has permission for a specific module and action
   */
  const hasPermission = (
    module: string,
    action: "view" | "create" | "edit" | "delete" | "export"
  ): boolean => {
    // Super admin has all permissions
    if (role === "super_admin") return true;

    // Company admin has all permissions within their company
    if (role === "company_admin") return true;

    // Company user - check custom role permissions
    if (role === "company_user") {
      const permission = permissions.find((p) => p.module === module);
      if (!permission) return false;

      switch (action) {
        case "view":
          return permission.canView;
        case "create":
          return permission.canCreate;
        case "edit":
          return permission.canEdit;
        case "delete":
          return permission.canDelete;
        case "export":
          return permission.canExport;
        default:
          return false;
      }
    }

    return false;
  };

  /**
   * Check if user can access admin panel (Roles, Users, Companies, etc.)
   */
  const canAccessAdminPanel = (): boolean => {
    return role === "super_admin" || role === "company_admin";
  };

  return {
    role,
    permissions,
    isLoading,
    hasPermission,
    canAccessAdminPanel,
  };
}
