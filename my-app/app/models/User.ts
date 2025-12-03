import { Schema, model, models, Types } from "mongoose";

const SettingsSchema = new Schema(
  {
    profile: {
      username: String,
      bio: String,
      urls: [String],
    },
    appearance: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      compact: { type: Boolean, default: false },
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      pushAlerts: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: false },
    },
    display: {
      tableDensity: {
        type: String,
        enum: ["comfortable", "compact", "spacious"],
        default: "comfortable",
      },
      showAvatars: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    
    // Multi-tenant fields
    role: {
      type: String,
      enum: ["super_admin", "company_admin", "company_user"],
      default: "company_admin", // Default for signup
      required: true,
    },
    
    // Company/Organization fields
    companyId: { type: Types.ObjectId, ref: "Company" }, // Reference to company
    companyName: { type: String }, // For company admins during signup
    
    // Custom role for company users
    customRoleId: { type: Types.ObjectId, ref: "Role" },
    
    // Location fields
    countryId: { type: String },
    stateId: { type: String },
    cityId: { type: String },
    
    // Verification
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
    
    // Status
    isActive: { type: Boolean, default: true },
    
    // Settings
    settings: { type: SettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ customRoleId: 1 });

export const User = models.User || model("User", UserSchema);
