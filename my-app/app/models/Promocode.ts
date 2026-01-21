import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPromocode extends Document {
    companyId: mongoose.Types.ObjectId;
    code: string;
    type: "percentage" | "flat";
    value: number;
    limit: number; // Usage limit
    usageCount: number; // Current usage count
    expiryDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PromocodeSchema: Schema = new Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        type: {
            type: String,
            enum: ["percentage", "flat"],
            required: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
        limit: {
            type: Number,
            default: 0, // 0 means unlimited or specified count
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate codes for the same company
PromocodeSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const Promocode: Model<IPromocode> =
    mongoose.models.Promocode || mongoose.model<IPromocode>("Promocode", PromocodeSchema);
