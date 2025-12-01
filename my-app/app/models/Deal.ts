import { Schema, model, models, Types } from "mongoose";

const DealSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    value: { type: Number, required: true },
    stage: {
      type: String,
      enum: ["new", "qualified", "proposal", "won", "lost"],
      default: "new",
    },
    contactId: { type: Types.ObjectId, ref: "Contact" },
    closeDate: { type: Date },
  },
  { timestamps: true }
);

export const Deal = models.Deal || model("Deal", DealSchema);
