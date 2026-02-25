import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { Role } from "@/app/models/Role";
import { Company } from "@/app/models/Company";
import { getDefaultRoleByName, DEFAULT_ROLE_IDS } from "@/lib/staticDefaultRoles";

export type AuthPayload = {
  userId: string;
  email: string;
  role: string;
  companyId?: string;
};

export type CurrentUser = AuthPayload & {
  firstName: string;
  lastName: string;
  companyName?: string;
  customRoleId?: string;
  permissions?: any[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("crm_token")?.value;
    if (!token) return null;

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthPayload;

    // ─── FAST PATH: super_admin & company_admin ────────────────────────────
    // Ye roles ke liye saari permissions hamesha allowed hain.
    // JWT mein role aur companyId already store hain —
    // isliye DB hit bilkul zaroori nahi.
    if (payload.role === "super_admin" || payload.role === "company_admin") {
      return {
        userId: payload.userId,
        email: payload.email,
        firstName: "",          // /api/auth/me refreshes full profile separately
        lastName: "",
        role: payload.role,
        companyId: payload.companyId ?? undefined,
        permissions: [],        // admins always get full access in checkPermission()
      };
    }

    // ─── SLOW PATH: company_user / employee / contact ─────────────────────
    // Inke liye custom role permissions DB se laanai padti hain.
    await connectDB();
    const user = await User.findById(payload.userId).lean();
    if (!user || !user.isActive) return null;

    let permissions: any[] = [];
    let companyName = user.companyName;

    if (user.defaultRoleName) {
      const defaultRole = getDefaultRoleByName(user.defaultRoleName as any);
      permissions = defaultRole?.permissions || [];
    } else if (user.customRoleId) {
      const role = await Role.findById(user.customRoleId).select('permissions').lean();
      permissions = role?.permissions || [];
    }

    if (user.companyId && !companyName) {
      const company = await Company.findById(user.companyId).select('name').lean();
      companyName = company?.name;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId?.toString(),
      companyName: companyName,
      customRoleId: user.defaultRoleName
        ? DEFAULT_ROLE_IDS[user.defaultRoleName] || user.customRoleId?.toString()
        : user.customRoleId?.toString(),
      permissions: permissions,
    };
  } catch {
    return null;
  }
}

// Check if user has permission for a specific module and action
export async function checkPermission(
  userId: string,
  module: string,
  action: "view" | "create" | "edit" | "delete" | "export"
): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findById(userId).populate("customRoleId").lean();

    if (!user || !user.isActive) return false;

    // Super admin has all permissions
    if (user.role === "super_admin") return true;

    // Company admin has all permissions within their company
    if (user.role === "company_admin") return true;

    // Company user - check custom role or default (static) role permissions
    let permissions: any[] = [];
    if (user.defaultRoleName) {
      const defaultRole = getDefaultRoleByName(user.defaultRoleName as any);
      permissions = defaultRole?.permissions || [];
    } else if (user.customRoleId) {
      const role = user.customRoleId as any;
      permissions = role?.permissions || [];
    }

    if (user.role === "company_user" && permissions.length > 0) {
      const permission = permissions.find((p: any) => p.module === module);

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
  } catch {
    return false;
  }
}

// Get user's accessible companies (for super admin)
export async function getAccessibleCompanies(userId: string): Promise<string[]> {
  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    
    if (!user || !user.isActive) return [];
    
    // Super admin can access all companies
    if (user.role === "super_admin") {
      const companies = await Company.find({ isActive: true }).select("_id").lean();
      return companies.map((c) => c._id.toString());
    }
    
    // Company admin and users can only access their own company
    if (user.companyId) {
      return [user.companyId.toString()];
    }
    
    return [];
  } catch {
    return [];
  }
}

// Middleware to check if user is super admin
export async function requireSuperAdmin(userId: string): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    return user?.role === "super_admin" && user?.isActive;
  } catch {
    return false;
  }
}

// Middleware to check if user is company admin
export async function requireCompanyAdmin(userId: string): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    return (
      (user?.role === "super_admin" || user?.role === "company_admin") &&
      user?.isActive
    );
  } catch {
    return false;
  }
}
