import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PaymentSettings } from "@/app/models/PaymentSettings";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let paymentSettings = await PaymentSettings.findOne({ companyId: user.companyId });

    // If no settings exist, create default ones
    if (!paymentSettings) {
        paymentSettings = await PaymentSettings.create({
            companyId: user.companyId,
            // Legacy
            payLocally: true,
            fattmerchantEnabled: false,
            fattmerchantApiKey: "",
            fattmerchantMerchantId: "",
            // New
            paymentEnabled: false,
            currency: "USD",
            paymentMode: "test",
            razorpay: { enabled: false, keyId: "", keySecret: "" },
            stripe: { enabled: false, publishableKey: "", secretKey: "" },
            paypal: { enabled: false, clientId: "", secret: "" },
            platformCommission: 0,
            tax: { enabled: false, percentage: 0 },
            convenienceFee: { enabled: false, amount: 0 },
            refund: { enabled: false, maxDays: 0 },
            invoice: { enabled: false, prefix: "" },
            autoCapture: true
        });
    }

    return NextResponse.json(paymentSettings);
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Destructure all fields to be safe and explicit
    const {
        // Legacy
        payLocally,
        fattmerchantEnabled,
        fattmerchantApiKey,
        fattmerchantMerchantId,

        // New
        paymentEnabled,
        currency,
        paymentMode,
        razorpay,
        stripe,
        paypal,
        platformCommission,
        tax,
        convenienceFee,
        refund,
        invoice,
        autoCapture
    } = body;

    await connectDB();

    let paymentSettings = await PaymentSettings.findOne({ companyId: user.companyId });

    if (!paymentSettings) {
        // Create new settings
        paymentSettings = await PaymentSettings.create({
            companyId: user.companyId,
            // Legacy
            payLocally: payLocally ?? true,
            fattmerchantEnabled: fattmerchantEnabled ?? false,
            fattmerchantApiKey: fattmerchantApiKey ?? "",
            fattmerchantMerchantId: fattmerchantMerchantId ?? "",
            // New
            paymentEnabled: paymentEnabled ?? false,
            currency: currency ?? "USD",
            paymentMode: paymentMode ?? "test",
            razorpay: razorpay || { enabled: false, keyId: "", keySecret: "" },
            stripe: stripe || { enabled: false, publishableKey: "", secretKey: "" },
            paypal: paypal || { enabled: false, clientId: "", secret: "" },
            platformCommission: platformCommission ?? 0,
            tax: tax || { enabled: false, percentage: 0 },
            convenienceFee: convenienceFee || { enabled: false, amount: 0 },
            refund: refund || { enabled: false, maxDays: 0 },
            invoice: invoice || { enabled: false, prefix: "" },
            autoCapture: autoCapture ?? true
        });
    } else {
        // Update existing settings
        // Legacy
        paymentSettings.payLocally = payLocally ?? paymentSettings.payLocally;
        paymentSettings.fattmerchantEnabled = fattmerchantEnabled ?? paymentSettings.fattmerchantEnabled;
        paymentSettings.fattmerchantApiKey = fattmerchantApiKey ?? paymentSettings.fattmerchantApiKey;
        paymentSettings.fattmerchantMerchantId = fattmerchantMerchantId ?? paymentSettings.fattmerchantMerchantId;

        // New
        if (paymentEnabled !== undefined) paymentSettings.paymentEnabled = paymentEnabled;
        if (currency !== undefined) paymentSettings.currency = currency;
        if (paymentMode !== undefined) paymentSettings.paymentMode = paymentMode;

        if (razorpay) paymentSettings.razorpay = razorpay;
        if (stripe) paymentSettings.stripe = stripe;
        if (paypal) paymentSettings.paypal = paypal;

        if (platformCommission !== undefined) paymentSettings.platformCommission = platformCommission;
        if (tax) paymentSettings.tax = tax;
        if (convenienceFee) paymentSettings.convenienceFee = convenienceFee;
        if (refund) paymentSettings.refund = refund;
        if (invoice) paymentSettings.invoice = invoice;
        if (autoCapture !== undefined) paymentSettings.autoCapture = autoCapture;

        await paymentSettings.save();
    }

    return NextResponse.json(paymentSettings);
}
