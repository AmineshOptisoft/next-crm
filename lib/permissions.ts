import { NextResponse } from "next/server";
import { getCurrentUser, CurrentUser } from "@/lib/auth";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

/**
 * Middleware to check if user has permission for a specific module and action
 * Returns the current user if authorized, or an error response
 */
export async function checkPermission(
  module: string,
  action: PermissionAction
): Promise<
  | { authorized: true; user: CurrentUser }
  | { authorized: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // Super admin has all permissions
  if (user.role === "super_admin") {
    return { authorized: true, user };
  }

  // Company admin has all permissions within their company
  if (user.role === "company_admin") {
    return { authorized: true, user };
  }

  // Company user - check custom role permissions
  if (user.role === "company_user") {
    const permission = user.permissions?.find((p: any) => p.module === module);

    if (!permission) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden - No access to this module" },
          { status: 403 }
        ),
      };
    }

    let hasAccess = false;
    switch (action) {
      case "view":
        hasAccess = permission.canView;
        break;
      case "create":
        hasAccess = permission.canCreate;
        break;
      case "edit":
        hasAccess = permission.canEdit;
        break;
      case "delete":
        hasAccess = permission.canDelete;
        break;
      case "export":
        hasAccess = permission.canExport;
        break;
    }

    if (!hasAccess) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: `Forbidden - Cannot ${action} ${module}` },
          { status: 403 }
        ),
      };
    }

    return { authorized: true, user };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Forbidden - Invalid role" },
      { status: 403 }
    ),
  };
}

/**
 * Middleware to check if user is super admin or company admin
 */
export async function requireAdminAccess(): Promise<
  | { authorized: true; user: CurrentUser }
  | { authorized: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (user.role === "super_admin" || user.role === "company_admin") {
    return { authorized: true, user };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    ),
  };
}

/**
 * Middleware to check if user is super admin only
 */
export async function requireSuperAdminAccess(): Promise<
  | { authorized: true; user: CurrentUser }
  | { authorized: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (user.role === "super_admin") {
    return { authorized: true, user };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Forbidden - Super admin access required" },
      { status: 403 }
    ),
  };
}

/**
 * Helper function to build MongoDB query filter based on user role
 * Super admins can access all data (returns empty filter)
 * Regular users can only access data from their company
 */
export function buildCompanyFilter(user: CurrentUser): { companyId?: string } {
  // Super admin can see all data from all companies
  if (user.role === "super_admin") {
    return {};
  }
  
  // Regular users can only see data from their company
  if (!user.companyId) {
    throw new Error("No company associated with user");
  }
  
  return { companyId: user.companyId };
}

/**
 * Validates that a user has a companyId (unless they're a super admin)
 * Returns true if valid, throws error with message if invalid
 */
export function validateCompanyAccess(user: CurrentUser): boolean {
  // Super admins don't need a companyId
  if (user.role === "super_admin") {
    return true;
  }
  
  // All other users must have a companyId
  if (!user.companyId) {
    throw new Error("No company associated");
  }
  
  return true;
}
