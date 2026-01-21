import { Schema, model, models } from "mongoose";

const IndustrySchema = new Schema(
  {
    // Global list controlled by super admins; older records may still have companyId
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: false, default: null },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

IndustrySchema.index({ name: 1 }, { unique: true });
IndustrySchema.index({ isActive: 1 });

// Prevent Mongoose OverwriteModelError in dev
if (models.Industry) {
  delete models.Industry;
}

export const Industry = model("Industry", IndustrySchema);

