"use client";

import useSWR from "swr";

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

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export function usePermissions(module: string): UserPermissions {
  const { data, error, isLoading } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false, // avoid redundant requests
    revalidateIfStale: false,
    dedupingInterval: 60000,   // cache for 60 seconds
  });

  if (isLoading || !data) {
     return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canView: false,
        isLoading: true,
     };
  }

  if (error) {
     return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canView: false,
        isLoading: false,
     };
  }

  const user: User = data.user;

  // Super admin and company admin have all permissions
  if (user?.role === "super_admin" || user?.role === "company_admin") {
    return {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canView: true,
      isLoading: false,
    };
  }

  // For other roles, check specific permissions
  if (user?.permissions) {
    const permission = user.permissions.find((p) => p.module === module);
    if (permission) {
      return {
        canCreate: permission.canCreate,
        canEdit: permission.canEdit,
        canDelete: permission.canDelete,
        canExport: permission.canExport,
        canView: permission.canView,
        isLoading: false,
      };
    }
  }

  // No permissions found
  return {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    canView: false,
    isLoading: false,
  };
}
