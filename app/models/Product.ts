import { Schema, model, models, Types } from "mongoose";

const ProductSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String },
    sku: { type: String, unique: true },
    category: { type: String },
    price: { type: Number, required: true },
    cost: { type: Number },
    currency: { type: String, default: "USD" },
    unit: { type: String, default: "unit" }, // unit, hour, day, etc.
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    taxRate: { type: Number, default: 0 }, // percentage
    image: { type: String },
  },
  { timestamps: true }
);

// Indexes for performance (sku index is already created via unique: true in schema)
ProductSchema.index({ companyId: 1, isActive: 1 });
ProductSchema.index({ ownerId: 1, isActive: 1 });

export const Product = models.Product || model("Product", ProductSchema);
