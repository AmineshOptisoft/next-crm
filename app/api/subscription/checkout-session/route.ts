import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { Plan } from "@/app/models/Plan";
import { PlanPayment } from "@/app/models/PlanPayment";
import { getServerEnvVar } from "@/lib/server-env";

type BillingPeriod = "monthly" | "yearly";

function getAmountForPeriod(monthlyPrice: number, period: BillingPeriod) {
  if (period === "yearly") {
    return Math.round(monthlyPrice * 12 * (1 - 0.12));
  }
  return monthlyPrice;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can upgrade subscription plans." },
      { status: 403 }
    );
  }

  const stripeSecretKey = getServerEnvVar("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured in environment variables." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const planSlug = String(body?.planSlug || "").toLowerCase().trim();
  const billingPeriod = String(body?.period || "monthly") as BillingPeriod;

  if (!planSlug) {
    return NextResponse.json({ error: "planSlug is required." }, { status: 400 });
  }
  if (!["monthly", "yearly"].includes(billingPeriod)) {
    return NextResponse.json(
      { error: "period must be monthly or yearly." },
      { status: 400 }
    );
  }

  await connectDB();
  const plan = await Plan.findOne({ slug: planSlug, isActive: true }).lean();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }
  if (plan.price <= 0) {
    return NextResponse.json(
      { error: "This plan does not require payment." },
      { status: 400 }
    );
  }

  const finalAmount = getAmountForPeriod(plan.price, billingPeriod);
  const stripe = new Stripe(stripeSecretKey);

  const baseUrl = getServerEnvVar("NEXT_PUBLIC_APP_URL") || req.nextUrl.origin;
  const payment = await PlanPayment.create({
    companyId: user.companyId,
    userId: user.userId,
    planSlug: plan.slug,
    planTitle: plan.title,
    billingPeriod,
    amount: finalAmount,
    currency: "usd",
    status: "pending",
    metadata: {
      companyId: user.companyId,
      email: user.email,
    },
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      payment_intent_data: {
        metadata: {
          paymentId: payment._id.toString(),
          companyId: user.companyId,
          planSlug: plan.slug,
          period: billingPeriod,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.title} Plan (${billingPeriod})`,
              description: plan.description,
            },
            unit_amount: finalAmount * 100,
          },
        },
      ],
      success_url: `${baseUrl}/dashboard/company-settings?tab=subscription&upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/company-settings?tab=subscription&upgrade=cancelled`,
      metadata: {
        paymentId: payment._id.toString(),
        companyId: user.companyId,
        planSlug: plan.slug,
        period: billingPeriod,
      },
    });

    payment.stripeCheckoutSessionId = session.id;
    await payment.save();

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    payment.status = "failed";
    payment.metadata = {
      ...Object.fromEntries(payment.metadata || new Map()),
      error: error?.message || "Stripe session creation failed",
    };
    await payment.save();

    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
