import mongoose, { Document, Model, Schema } from "mongoose";

export interface IServiceArea extends Document {
    companyId: mongoose.Types.ObjectId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceAreaSchema: Schema = new Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate service area names for the same company
ServiceAreaSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const ServiceArea: Model<IServiceArea> =
    mongoose.models.ServiceArea || mongoose.model<IServiceArea>("ServiceArea", ServiceAreaSchema);
