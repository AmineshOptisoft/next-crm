import { Schema, model, models, Types } from "mongoose";

const ContactSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    status: { type: String, enum: ["lead", "customer"], default: "lead" },
  },
  { timestamps: true }
);

export const Contact = models.Contact || model("Contact", ContactSchema);
