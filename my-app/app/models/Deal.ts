import { Schema, model, models, Types } from "mongoose";

const DealProductSchema = new Schema({
  productId: { type: Types.ObjectId, ref: "Product" },
  quantity: { type: Number, default: 1 },
  price: { type: Number },
  discount: { type: Number, default: 0 },
});

const DealSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    value: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    stage: {
      type: String,
      enum: ["new", "qualified", "proposal", "negotiation", "won", "lost"],
      default: "new",
    },
    probability: { type: Number, min: 0, max: 100, default: 50 }, // Win probability %
    contactId: { type: Types.ObjectId, ref: "User" },
    assignedTo: { type: Types.ObjectId, ref: "User" },
    closeDate: { type: Date },
    expectedCloseDate: { type: Date },
    products: [DealProductSchema],
    source: {
      type: String,
      enum: ["website", "referral", "cold-call", "email", "social-media", "other"],
    },
    notes: { type: String },
    lostReason: { type: String },
  },
  { timestamps: true }
);

DealSchema.index({ companyId: 1, stage: 1 });
DealSchema.index({ ownerId: 1, stage: 1 });
DealSchema.index({ assignedTo: 1 });

if (models && models.Deal) {
  delete (models as any).Deal;
}

export const Deal = model("Deal", DealSchema);
