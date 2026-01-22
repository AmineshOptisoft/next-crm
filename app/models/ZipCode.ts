import mongoose, { Document, Model, Schema } from "mongoose";

export interface IZipCode extends Document {
    companyId: mongoose.Types.ObjectId;
    zone: string;
    code: string;
    createdAt: Date;
    updatedAt: Date;
}

const ZipCodeSchema: Schema = new Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        zone: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate zip codes for the same company (or maybe same company+zone? zip code should be unique per company generally)
ZipCodeSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const ZipCode: Model<IZipCode> =
    mongoose.models.ZipCode || mongoose.model<IZipCode>("ZipCode", ZipCodeSchema);
