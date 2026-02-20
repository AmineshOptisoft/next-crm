import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";

// Full up-to-date permissions for each default system role
const DEFAULT_ROLE_PERMISSIONS: Record<string, object[]> = {
  "Sales Manager": [
    { module: "dashboard",     canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "contacts",      canView: true,  canCreate: true,  canEdit: true,  canDelete: true,  canExport: true  },
    { module: "deals",         canView: true,  canCreate: true,  canEdit: true,  canDelete: true,  canExport: true  },
    { module: "activities",    canView: true,  canCreate: true,  canEdit: true,  canDelete: true,  canExport: false },
    { module: "meetings",      canView: true,  canCreate: true,  canEdit: true,  canDelete: true,  canExport: false },
    { module: "tasks",         canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "invoices",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: true  },
    { module: "products",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "appointments",  canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "email-builder", canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "roles",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "users",         canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "services",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "industries",    canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "companies",     canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
  ],
  "Sales Representative": [
    { module: "dashboard",     canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "contacts",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "deals",         canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "activities",    canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "meetings",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "tasks",         canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: false },
    { module: "invoices",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: true  },
    { module: "products",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "appointments",  canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "email-builder", canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "roles",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "users",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "services",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "industries",    canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "companies",     canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
  ],
  "Accountant": [
    { module: "dashboard",     canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "contacts",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "deals",         canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "activities",    canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "meetings",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "tasks",         canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "invoices",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: true  },
    { module: "products",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false, canExport: true  },
    { module: "appointments",  canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "email-builder", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "roles",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "users",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "services",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "industries",    canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "companies",     canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
  ],
  "Viewer": [
    { module: "dashboard",     canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "contacts",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "deals",         canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "activities",    canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "meetings",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "tasks",         canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "invoices",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "products",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "appointments",  canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "email-builder", canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "roles",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "users",         canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "services",      canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "industries",    canView: true,  canCreate: false, canEdit: false, canDelete: false, canExport: false },
    { module: "companies",     canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
  ],
};

export async function POST() {
  try {
    await connectDB();

    const roleNames = Object.keys(DEFAULT_ROLE_PERMISSIONS);
    const results: Record<string, number> = {};

    for (const roleName of roleNames) {
      const permissions = DEFAULT_ROLE_PERMISSIONS[roleName];

      // Update ALL documents matching this system-role name, across every company
      const result = await Role.updateMany(
        { name: roleName, isSystemRole: true },
        { $set: { permissions } }
      );

      results[roleName] = result.modifiedCount;
    }

    const totalUpdated = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Migration complete. Updated ${totalUpdated} role(s) across all companies.`,
      breakdown: results,
    });
  } catch (error: any) {
    console.error("Role migration error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
