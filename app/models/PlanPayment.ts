import { Schema, model, models, Types } from "mongoose";

const PlanPaymentSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    planSlug: { type: String, required: true, trim: true, lowercase: true },
    planTitle: { type: String, required: true, trim: true },
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    currency: { type: String, default: "usd", lowercase: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "expired"],
      default: "pending",
    },
    stripeCheckoutSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    stripeCustomerId: { type: String, index: true, sparse: true },
    paidAt: { type: Date },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

PlanPaymentSchema.index({ companyId: 1, createdAt: -1 });
PlanPaymentSchema.index({ status: 1, createdAt: -1 });

export const PlanPayment =
  models.PlanPayment || model("PlanPayment", PlanPaymentSchema);
