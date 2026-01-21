import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IPaymentSettings extends Document {
    companyId: mongoose.Types.ObjectId;

    // Payment Methods (Legacy)
    payLocally: boolean;
    fattmerchantEnabled: boolean;

    // Fattmerchant Configuration (Legacy)
    fattmerchantApiKey?: string;
    fattmerchantMerchantId?: string;

    // --- New Comprehensive Settings ---
    paymentEnabled: boolean;
    currency: string;
    paymentMode: string;

    razorpay: {
        enabled: boolean;
        keyId: string;
        keySecret: string;
    };

    stripe: {
        enabled: boolean;
        publishableKey: string;
        secretKey: string;
    };

    paypal: {
        enabled: boolean;
        clientId: string;
        secret: string;
    };

    platformCommission: number;

    tax: {
        enabled: boolean;
        percentage: number;
    };

    convenienceFee: {
        enabled: boolean;
        amount: number;
    };

    refund: {
        enabled: boolean;
        maxDays: number;
    };

    invoice: {
        enabled: boolean;
        prefix: string;
    };

    autoCapture: boolean;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSettingsSchema = new Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        unique: true, // One payment setting per company
    },

    // Payment Methods (Legacy)
    payLocally: { type: Boolean, default: true },
    fattmerchantEnabled: { type: Boolean, default: false },

    // Fattmerchant Configuration (Legacy)
    fattmerchantApiKey: { type: String, default: "" },
    fattmerchantMerchantId: { type: String, default: "" },

    // --- New Comprehensive Settings ---
    paymentEnabled: { type: Boolean, default: false },
    currency: { type: String, default: "USD" },
    paymentMode: { type: String, default: "test" }, // 'test' or 'live'

    razorpay: {
        enabled: { type: Boolean, default: false },
        keyId: { type: String, default: "" },
        keySecret: { type: String, default: "" }
    },

    stripe: {
        enabled: { type: Boolean, default: false },
        publishableKey: { type: String, default: "" },
        secretKey: { type: String, default: "" }
    },

    paypal: {
        enabled: { type: Boolean, default: false },
        clientId: { type: String, default: "" },
        secret: { type: String, default: "" }
    },

    platformCommission: { type: Number, default: 0 },

    tax: {
        enabled: { type: Boolean, default: false },
        percentage: { type: Number, default: 0 }
    },

    convenienceFee: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 }
    },

    refund: {
        enabled: { type: Boolean, default: false },
        maxDays: { type: Number, default: 0 }
    },

    invoice: {
        enabled: { type: Boolean, default: false },
        prefix: { type: String, default: "" }
    },

    autoCapture: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Index for faster queries
PaymentSettingsSchema.index({ companyId: 1 });

export const PaymentSettings = models.PaymentSettings || model<IPaymentSettings>("PaymentSettings", PaymentSettingsSchema);
