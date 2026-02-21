import { Schema, model, models, Types } from "mongoose";

// Permission schema for granular access control
const PermissionSchema = new Schema(
  {
    module: {
      type: String,
      required: true,
      enum: [
        "dashboard",
        "tasks",
        "contacts",
        "deals",
        "products",
        "appointments",
        "invoices",
        "meetings",
        "activities",
        "email-builder",
        "roles",
        "users",
        "services",
        "industries",
        "companies",
      ],
    },
    canView: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canExport: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoleSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    description: { type: String },

    // Permissions array
    permissions: [PermissionSchema],

    // System roles cannot be deleted
    isSystemRole: { type: Boolean, default: false },

    // Default roles are auto-created for every company and shown to all admins
    isDefaultRole: { type: Boolean, default: false },

    // Status
    isActive: { type: Boolean, default: true },

    // Created by
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index for company and role name uniqueness
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });
RoleSchema.index({ companyId: 1, isActive: 1 });

// Prevent Mongoose OverwriteModelError
if (models.Role) {
  delete models.Role;
}

export const Role = model("Role", RoleSchema);

// Helper function to create default roles for a company
export async function createDefaultRoles(companyId: string, adminId: string) {
  const defaultRoles = [
    {
      name: "Sales Manager",
      description: "Can manage contacts, deals, and activities",
      permissions: [
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
    },
    {
      name: "Sales Representative",
      description: "Can view and create contacts and deals",
      permissions: [
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
    },
    {
      name: "Accountant",
      description: "Can manage invoices and products",
      permissions: [
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
    },
    {
      name: "Viewer",
      description: "Read-only access to most modules",
      permissions: [
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
    },
  ];

  // Upsert each default role.
  //
  // KEY RULE: $set and $setOnInsert MUST NOT share the same field paths.
  // When MongoDB executes an upsert that inserts a new document, it applies
  // BOTH operators simultaneously. If the same path appears in both, MongoDB
  // throws "Updating the path '...' would create a conflict" — which was
  // the silent bug causing default roles to never be created for new companies.
  //
  // Fix: $set   → only the fields that should refresh on every call (permissions + flags)
  //      $setOnInsert → only the identity/metadata fields set once on creation
  for (const roleData of defaultRoles) {
    try {
      await Role.updateOne(
        { companyId, name: roleData.name },
        {
          // Refreshed on every upsert (update or insert)
          $set: {
            permissions: roleData.permissions,
            isSystemRole: true,
            isDefaultRole: true,
            isActive: true,
          },
          // Written ONLY when a brand-new document is inserted
          $setOnInsert: {
            companyId,
            name: roleData.name,
            description: roleData.description,
            createdBy: adminId,
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error(`createDefaultRoles: failed to upsert "${roleData.name}":`, err);
    }
  }
}
