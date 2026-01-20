import { Schema, model, models, Types } from "mongoose";

// Permission schema for granular access control
const PermissionSchema = new Schema(
  {
    module: {
      type: String,
      required: true,
      enum: [
        "dashboard",
        "employees",
        "tasks",
        "contacts",
        "deals",
        "products",
        "invoices",
        "meetings",
        "activities",
        "analytics",
        "settings",
        "roles",
        "users",
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
    
    // Status
    isActive: { type: Boolean, default: true },
    
    // Role hierarchy
    // isParent: 1 means this role can be a parent (no parent assigned)
    // isParent: 0 means this role has a parent (child role)
    isParent: { type: Number, default: 1, enum: [0, 1] },
    parentRoleId: { type: Schema.Types.ObjectId, ref: "Role", default: null },
    
    // Created by
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index for company and role name uniqueness
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });
RoleSchema.index({ companyId: 1, isActive: 1 });

// Prevent Mongoose OverwriteModelError
// Delete the model if it exists to allow recompilation with new schema changes in dev
if (models.Role) {
  delete models.Role;
}

export const Role = model("Role", RoleSchema);

// Helper function to create default roles for a company
export async function createDefaultRoles(companyId: string, adminId: string) {
  const defaultRoles = [
    {
      companyId,
      name: "Sales Manager",
      description: "Can manage contacts, deals, and activities",
      isSystemRole: true,
      createdBy: adminId,
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "contacts", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
        { module: "deals", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
        { module: "activities", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: false },
        { module: "meetings", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: false },
        { module: "tasks", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
        { module: "analytics", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
      ],
    },
    {
      companyId,
      name: "Sales Representative",
      description: "Can view and create contacts and deals",
      isSystemRole: true,
      createdBy: adminId,
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "contacts", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
        { module: "deals", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
        { module: "activities", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
        { module: "meetings", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
        { module: "tasks", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false },
      ],
    },
    {
      companyId,
      name: "Accountant",
      description: "Can manage invoices and products",
      isSystemRole: true,
      createdBy: adminId,
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "products", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "contacts", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "deals", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      ],
    },
    {
      companyId,
      name: "Viewer",
      description: "Read-only access to most modules",
      isSystemRole: true,
      createdBy: adminId,
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "contacts", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "deals", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "tasks", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "activities", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "analytics", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      ],
    },
  ];

  await Role.insertMany(defaultRoles);
}
