import { Schema, model, models } from "mongoose";

const ContactSchema = new Schema(
  {
    ownerId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    status: {
      type: String,
      enum: ["lead", "prospect", "customer", "inactive"],
      default: "lead",
    },
  },
  { timestamps: true }
);

export const Contact = models.Contact || model("Contact", ContactSchema);
