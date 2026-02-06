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
      enum: ["super_admin", "company_admin", "company_user", "contact", "employee"],
      default: "company_admin", // Default for signup
      required: true,
    },

    // Company/Organization fields
    companyId: { type: Types.ObjectId, ref: "Company" }, // Reference to company
    ownerId: { type: Types.ObjectId, ref: "User" }, // For contacts: who created them
    companyName: { type: String }, // For company admins during signup or contact company name

    // Custom role for company users
    customRoleId: { type: Types.ObjectId, ref: "Role" },

    // Location fields
    country: { type: String },
    state: { type: String },
    city: { type: String },
    countryId: { type: String },
    stateId: { type: String },
    cityId: { type: String },

    // Extended Profile Fields
    phoneNumber: { type: String },
    // keapId removed
    address: { type: String },
    zipCode: { type: String },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: "Prefer not to say"
    },

    // Contact / Client specific fields
    contactStatus: {
      type: String,
      enum: ["lead", "prospect", "customer", "inactive", "maturing", "new lead"],
      default: "lead",
    },
    leadSource: {
      type: String,
      enum: ["website", "referral", "cold-call", "email", "social-media", "event", "other"],
    },
    billingAddress: {
      street: String,
      country: String,
      state: String,
      city: String,
      zipCode: String,
    },
    shippingAddress: {
      street: String,
      country: String,
      state: String,
      city: String,
      zipCode: String,
    },
    shippingAddresses: [{
      title: String,
      street: String,
      country: String,
      state: String,
      city: String,
      zipCode: String,
    }],
    smsStatus: { type: Boolean, default: false },
    emailStatus: { type: Boolean, default: false },
    bathrooms: { type: String },
    bedrooms: { type: String },
    specialInstructions: { type: String },
    zoneName: { type: String },
    fsrAssigned: { type: String },
    staxId: { type: String },
    lastAppointment: { type: Date },
    nextAppointment: { type: Date },
    assignedTo: { type: Types.ObjectId, ref: "User" }, // Replaced reference to Employee with User
    notes: { type: String },

    // Booking / Service Data
    defaultPaymentMethod: { type: String },
    billedAmount: { type: String },
    billedHours: { type: String },
    keyNumber: { type: String },
    preferences: { type: String },
    familyInfo: { type: String },
    parkingAccess: { type: String },
    preferredTechnician: { type: String },
    clientNotesFromTech: { type: String },
    specialInstructionsClient: { type: String },
    specialInstructionsAdmin: { type: String },
    billingNotes: { type: String },
    discount: { type: String },
    serviceDefaults: { type: Schema.Types.Mixed },
    lastContactedAt: { type: Date },
    tags: [{ type: String }],

    // Working Area & Technician Settings
    zone: { type: String },
    workingZipCodes: [{ type: String }], // Comma separated list in UI, stored as array or string.

    // Toggles
    timesheetEnabled: { type: Boolean, default: false },
    bookingEnabled: { type: Boolean, default: false },
    availabilityEnabled: { type: Boolean, default: false },
    availability: [{
      day: String,
      isOpen: Boolean,
      startTime: String,
      endTime: String
    }],
    isTechnicianActive: { type: Boolean, default: true }, // "Technician Status"

    // Role & Image
    staffRole: { type: String, enum: ["Staff", "Trainee"], default: "Staff" },
    avatarUrl: { type: String },

    workingArea: [{ type: String }], // Keeping for backward compat if needed or just remove?
    description: { type: String },

    // Services (Multi-select)
    services: [{ type: Schema.Types.ObjectId, ref: "Service" }],

    // Verification
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },

    // Reviews
    reviews: [{
      title: String,
      rating: Number,
      text: String,
      reviewer: String,
      createdAt: { type: Date, default: Date.now }
    }],

    // Employee specific fields
    position: { type: String },
    department: { type: String },
    salary: { type: Number },
    employeeStatus: {
      type: String,
      enum: ["active", "on-leave", "terminated"],
      default: "active",
    },
    hireDate: { type: Date },

    // Status
    isActive: { type: Boolean, default: true },

    // Settings
    settings: { type: SettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);


// Indexes for performance (email index is already created via unique: true in schema)
UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ customRoleId: 1 });
UserSchema.index({ role: 1, contactStatus: 1 });
UserSchema.index({ ownerId: 1 });

// Force delete the model if it exists to apply schema changes in dev
if (models && models.User) {
  delete (models as any).User;
}

export const User = model("User", UserSchema);
