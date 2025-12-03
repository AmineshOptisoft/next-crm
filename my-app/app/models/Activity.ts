import { Schema, model, models, Types } from "mongoose";

const ActivitySchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    contactId: { type: Types.ObjectId, ref: "Contact", required: true },
    dealId: { type: Types.ObjectId, ref: "Deal" },
    type: {
      type: String,
      enum: ["call", "email", "meeting", "note", "task"],
      required: true,
    },
    subject: { type: String, required: true },
    description: { type: String },
    duration: { type: Number }, // in minutes
    outcome: {
      type: String,
      enum: ["successful", "unsuccessful", "follow-up-required", "no-answer"],
    },
    scheduledAt: { type: Date },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    assignedTo: { type: Types.ObjectId, ref: "Employee" },
    attachments: [{ type: String }], // URLs to files
  },
  { timestamps: true }
);

// Index for faster queries
ActivitySchema.index({ companyId: 1, contactId: 1 });
ActivitySchema.index({ ownerId: 1, contactId: 1 });
ActivitySchema.index({ ownerId: 1, dealId: 1 });
ActivitySchema.index({ scheduledAt: 1 });

export const Activity = models.Activity || model("Activity", ActivitySchema);
