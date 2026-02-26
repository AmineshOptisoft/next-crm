import { Schema, model, models, Types } from "mongoose";

const CompanySchema = new Schema(
  {
    name: { type: String, required: true },
    adminId: { type: Types.ObjectId, ref: "User", required: true }, // Company admin who created it

    // Company details
    description: { type: String },
    industry: { type: String },
    website: { type: String },
    logo: { type: String },

    // Public site configuration (primary)
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    publicTemplate: {
      type: String,
      enum: ["templateA", "templateB"],
      default: "templateA",
    },

    // Contact information
    email: { type: String },
    phone: { type: String },

    // Address
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // Additional public sites for the same company
    publicSites: [
      {
        subdomain: {
          type: String,
          trim: true,
          lowercase: true,
        },
        template: {
          type: String,
          enum: ["templateA", "templateB"],
          default: "templateA",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Subscription/Plan (for future use)
    plan: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "free",
    },
    planExpiry: { type: Date },

    // Limits
    limits: {
      users: { type: Number, default: 10 },
      contacts: { type: Number, default: 1000 },
      deals: { type: Number, default: 500 },
    },

    // Status
    isActive: { type: Boolean, default: true },

    // Profile completion tracking
    profileCompleted: { type: Boolean, default: false },

    // Settings
    settings: {
      allowUserRegistration: { type: Boolean, default: false },
      requireEmailVerification: { type: Boolean, default: true },
      timezone: { type: String, default: "UTC" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
      currency: { type: String, default: "USD" },
      language: { type: String, default: "en" },
    },

    // Master Availability - Company-wide schedule
    masterAvailability: [
      {
        day: { type: String, required: true },
        isOpen: { type: Boolean, default: true },
        startTime: { type: String, default: "09:00 AM" },
        endTime: { type: String, default: "06:00 PM" },
      },
    ],

    // Mail Configuration
    mailConfig: {
      provider: { type: String, enum: ["smtp", "gmail"], default: "smtp" },
      smtp: {
        host: { type: String },
        port: { type: Number },
        username: { type: String },
        password: { type: String },
        fromEmail: { type: String },
        fromName: { type: String },
      },
      gmail: {
        accessToken: { type: String },
        refreshToken: { type: String },
        expiryDate: { type: Number },
        email: { type: String },
      }
    },
  },
  {
    timestamps: true,
    // Ensure profileCompleted is included in JSON responses
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

CompanySchema.index({ adminId: 1 });
CompanySchema.index({ name: 1 });
CompanySchema.index({ subdomain: 1 }, { unique: true, sparse: true });
CompanySchema.index({ "publicSites.subdomain": 1 }, { unique: true, sparse: true });

export const Company = models.Company || model("Company", CompanySchema);
