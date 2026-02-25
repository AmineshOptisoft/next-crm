import mongoose, { Schema, Document, models, model } from "mongoose";

export interface ISubService {
    name: string;
    description?: string;
    price?: number;
}

export interface IService extends Document {
    name: string; // Service Title
    logo?: string; // Service Logo
    description?: string;
    availability: "new_client" | "existing_client" | "both" | "admin_service";
    percentage?: number; // Service Percentage (%)

    // Pricing
    priceType: "fixed" | "hourly";
    basePrice?: number; // Fixed price service ke liye
    hourlyRate?: number; // Hour-based services ke liye

    status: "active" | "inactive" | "archived";
    category: "main" | "sub" | "addon";

    // Hierarchy
    parentId?: mongoose.Types.ObjectId; // If this is a child service
    subServices: ISubService[]; // Kept for backward compatibility or simple lists

    // Estimated time in minutes (for sub-services and addons)
    estimatedTime?: number;

    companyId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SubServiceSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number }
});

const ServiceSchema = new Schema({
    name: { type: String, required: true }, // Service Title
    logo: { type: String }, // URL to image/logo
    description: { type: String },

    availability: {
        type: String,
        enum: ["new_client", "existing_client", "both", "admin_service"],
        default: "both"
    },

    percentage: { type: Number, min: 0, max: 100 },

    priceType: {
        type: String,
        enum: ["fixed", "hourly"],
        default: "fixed"
    },
    basePrice: { type: Number },
    hourlyRate: { type: Number },

    status: {
        type: String,
        enum: ["active", "inactive", "archived"],
        default: "active"
    },

    category: {
        type: String,
        enum: ["main", "sub", "addon"],
        default: "main"
    },

    // Parent/Child relationship for complex hierarchy
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        default: null
    },

    // Associate with a company
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },

    // Kept for simple use cases
    subServices: {
        type: [SubServiceSchema],
        default: []
    },

    // Estimated time in minutes (for sub-services and addons)
    estimatedTime: { type: Number, min: 0 }
}, { timestamps: true });

// Optimized index for hierarchy + status lookups, e.g. technician services API
ServiceSchema.index({
    companyId: 1,
    parentId: 1,
    category: 1,
    status: 1,
});

export const Service = models.Service || model<IService>("Service", ServiceSchema);
