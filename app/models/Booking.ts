import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IBooking extends Document {
    contactId: mongoose.Types.ObjectId;
    technicianId: mongoose.Types.ObjectId;
    serviceId: mongoose.Types.ObjectId;

    subServices: {
        serviceId: mongoose.Types.ObjectId;
        quantity: number;
    }[];

    addons: {
        serviceId: mongoose.Types.ObjectId;
        quantity: number;
    }[];

    bookingType: "once" | "recurring";
    frequency?: "weekly" | "monthly" | "custom";
    customRecurrence?: {
        interval: number;
        unit: "days" | "weeks" | "months";
        selectedDays?: number[]; // 0-6 for Sunday-Saturday
    };

    startDateTime: Date;
    endDateTime: Date;

    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        zone?: string;
    };

    notes?: string;

    pricing: {
        baseAmount: number;
        subServicesAmount: number;
        addonsAmount: number;
        totalAmount: number;
        discount: number;
        finalAmount: number;
        billedHours: number;
    };

    status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";

    // Recurring booking reference
    recurringGroupId?: string; // Same ID for all bookings in a recurring series

    companyId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema({
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    technicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },

    subServices: [{
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service"
        },
        quantity: {
            type: Number,
            default: 1,
            min: 0
        }
    }],

    addons: [{
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service"
        },
        quantity: {
            type: Number,
            default: 1,
            min: 0
        }
    }],

    bookingType: {
        type: String,
        enum: ["once", "recurring"],
        default: "once"
    },

    frequency: {
        type: String,
        enum: ["weekly", "monthly", "custom"]
    },

    customRecurrence: {
        interval: Number,
        unit: {
            type: String,
            enum: ["days", "weeks", "months"]
        },
        selectedDays: [Number] // 0-6 for Sunday-Saturday
    },

    startDateTime: {
        type: Date,
        required: true
    },

    endDateTime: {
        type: Date,
        required: true
    },

    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        zone: String
    },

    notes: String,

    pricing: {
        baseAmount: {
            type: Number,
            default: 0
        },
        subServicesAmount: {
            type: Number,
            default: 0
        },
        addonsAmount: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            default: 0
        },
        discount: {
            type: Number,
            default: 0
        },
        finalAmount: {
            type: Number,
            default: 0
        },
        billedHours: {
            type: Number,
            default: 0
        }
    },

    status: {
        type: String,
        enum: ["scheduled", "in_progress", "completed", "cancelled", "no_show"],
        default: "scheduled"
    },

    recurringGroupId: String,

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    }
}, { timestamps: true });

// Indexes for efficient queries
BookingSchema.index({ companyId: 1, startDateTime: 1 });
BookingSchema.index({ technicianId: 1, startDateTime: 1 });
BookingSchema.index({ contactId: 1 });
BookingSchema.index({ recurringGroupId: 1 });

export const Booking = models.Booking || model<IBooking>("Booking", BookingSchema);
