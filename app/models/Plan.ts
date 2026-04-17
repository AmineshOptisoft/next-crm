import { Schema, model, models } from "mongoose";

const PlanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    includedWithPlan: [{ type: String, required: true, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanSchema.index({ slug: 1 }, { unique: true });
PlanSchema.index({ isActive: 1 });

export const Plan = models.Plan || model("Plan", PlanSchema);
