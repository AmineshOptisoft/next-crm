import { Schema, model, models, Types } from "mongoose";

const ContactSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    position: { type: String },
    website: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    status: {
      type: String,
      enum: ["lead", "prospect", "customer", "inactive"],
      default: "lead",
    },
    leadSource: {
      type: String,
      enum: ["website", "referral", "cold-call", "email", "social-media", "event", "other"],
    },
    assignedTo: { type: Types.ObjectId, ref: "Employee" },
    tags: [{ type: String }],
    notes: { type: String },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

ContactSchema.index({ companyId: 1, status: 1 });
ContactSchema.index({ ownerId: 1, status: 1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ assignedTo: 1 });

export const Contact = models.Contact || model("Contact", ContactSchema);
