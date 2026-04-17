import { Schema, model, models, Types } from "mongoose";

const PaymentSchema = new Schema(
  {
    paymentId: { type: String, required: true, unique: true, trim: true },
    planId: { type: Types.ObjectId, ref: "Plan", required: true },
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd", lowercase: true, trim: true },
    duration: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["succeeded", "failed", "pending", "cancelled", "refunded"],
      default: "succeeded",
    },
    provider: {
      type: String,
      enum: ["stripe"],
      default: "stripe",
    },
    stripeCheckoutSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    stripeCustomerId: { type: String, index: true, sparse: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PaymentSchema.index({ companyId: 1, createdAt: -1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ planId: 1, createdAt: -1 });

export const Payment = models.Payment || model("Payment", PaymentSchema);
