/**
 * Static default system roles — not stored in DB.
 * Always returned by GET /api/roles so the list is never empty.
 * User assignment uses defaultRoleName on User + these definitions for permissions.
 */

export const DEFAULT_ROLE_IDS: Record<string, string> = {
  "Sales Manager": "default-sales-manager",
  "Sales Representative": "default-sales-representative",
  "Accountant": "default-accountant",
  "Viewer": "default-viewer",
};

export const DEFAULT_ROLE_NAMES = ["Viewer", "Accountant", "Sales Representative", "Sales Manager"] as const;
export type DefaultRoleName = (typeof DEFAULT_ROLE_NAMES)[number];

const STATIC_DEFAULT_ROLES = [
  {
    name: "Sales Manager" as const,
    description: "Can manage contacts, deals, and activities",
    permissions: [
      { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "contacts", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      { module: "deals", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
      { module: "activities", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: false },
      { module: "meetings", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: false },
      { module: "tasks", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      { module: "products", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "appointments", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "email-builder", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "roles", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "users", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "services", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "industries", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "companies", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    ],
  },
  {
    name: "Sales Representative" as const,
    description: "Can view and create contacts and deals",
    permissions: [
      { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "contacts", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "deals", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "activities", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "meetings", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "tasks", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      { module: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      { module: "products", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "appointments", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "email-builder", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "roles", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "users", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "services", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "industries", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "companies", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    ],
  },
  {
    name: "Accountant" as const,
    description: "Can manage invoices and products",
    permissions: [
      { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "contacts", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "deals", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "activities", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "meetings", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "tasks", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      { module: "products", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
      { module: "appointments", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "email-builder", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "roles", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "users", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "services", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "industries", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "companies", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    ],
  },
  {
    name: "Viewer" as const,
    description: "Read-only access to most modules",
    permissions: [
      { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "contacts", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "deals", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "activities", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "meetings", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "tasks", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "invoices", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "products", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "appointments", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "email-builder", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "roles", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "users", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "services", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "industries", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      { module: "companies", canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false },
    ],
  },
];

/** For API response: static roles with synthetic _id. No DB entry. */
export function getStaticRolesForApi() {
  return STATIC_DEFAULT_ROLES.map((r) => ({
    _id: DEFAULT_ROLE_IDS[r.name],
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    isSystemRole: true,
    isDefaultRole: true,
    isActive: true,
    companyId: null,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

/** Get permissions for a default role by name (for auth). */
export function getDefaultRoleByName(name: DefaultRoleName): { name: string; permissions: typeof STATIC_DEFAULT_ROLES[0]["permissions"] } | null {
  const role = STATIC_DEFAULT_ROLES.find((r) => r.name === name);
  return role ? { name: role.name, permissions: role.permissions } : null;
}

/** Map synthetic id from API to default role name for saving on User. */
export function defaultRoleIdToName(id: string): DefaultRoleName | null {
  const entry = Object.entries(DEFAULT_ROLE_IDS).find(([, v]) => v === id);
  return entry ? (entry[0] as DefaultRoleName) : null;
}

/** Check if id is a static default role id. */
export function isDefaultRoleId(id: string): boolean {
  return Object.values(DEFAULT_ROLE_IDS).includes(id);
}
