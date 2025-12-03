import { Schema, model, models, Types } from "mongoose";

const ReportSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "sales",
        "revenue",
        "employee_performance",
        "deal_pipeline",
        "contact_activity",
        "task_completion",
        "custom",
      ],
      required: true,
    },
    description: { type: String },
    filters: { type: Object }, // Dynamic filters
    dateRange: {
      start: { type: Date },
      end: { type: Date },
    },
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "quarterly"],
      },
      nextRun: { type: Date },
    },
    recipients: [{ type: String }], // Email addresses
    data: { type: Object }, // Cached report data
    lastGenerated: { type: Date },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ReportSchema.index({ ownerId: 1, type: 1 });

export const Report = models.Report || model("Report", ReportSchema);
