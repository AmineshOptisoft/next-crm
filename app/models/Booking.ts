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
        interval?: number;
        unit?: "days" | "weeks" | "months";
        // For weekly/custom: plain list of weekdays (0-6, Sunday-Saturday)
        selectedDays?: number[];
        // For monthly: specific week-of-month + weekday combinations
        monthlyWeeks?: { week: number; dayOfWeek: number }[]; // week: 1-5, dayOfWeek: 0-6
        // Series end date (no bookings after this)
        endDate?: string;
    };

    startDateTime: Date;
    endDateTime: Date;

    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country?: string;
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
    orderId: {
        type: String,
        unique: true,
        required: true
    },
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
        // Weekly/custom recurrence
        selectedDays: [Number], // 0-6 for Sunday-Saturday
        // Monthly recurrence: array of { week: 1-5, dayOfWeek: 0-6 }
        monthlyWeeks: [
            {
                week: Number,
                dayOfWeek: Number
            }
        ],
        // Recurrence series end date (no bookings after this)
        endDate: String
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
        country: String,
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
        enum: [
            "unconfirmed", "confirmed", "rejected",
            "invoice_sent", "paid", "closed", "deleted",
            "scheduled", "in_progress", "completed", "cancelled", "no_show" // Keeping old ones for compatibility
        ],
        default: "unconfirmed" // New default
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
