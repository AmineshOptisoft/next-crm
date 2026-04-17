import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { Plan } from "@/app/models/Plan";
import { PlanPayment } from "@/app/models/PlanPayment";
import { Company } from "@/app/models/Company";
import { User } from "@/app/models/User";
import { getServerEnvVar } from "@/lib/server-env";

type BillingPeriod = "monthly" | "yearly";

type SignupCheckoutTokenPayload = {
  userId: string;
  companyId: string;
  email: string;
};

function getAmountForPeriod(monthlyPrice: number, period: BillingPeriod) {
  if (period === "yearly") {
    return Math.round(monthlyPrice * 12 * (1 - 0.12));
  }
  return monthlyPrice;
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = getServerEnvVar("STRIPE_SECRET_KEY");
  const jwtSecret = getServerEnvVar("JWT_SECRET");
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured in environment variables." },
      { status: 500 }
    );
  }
  if (!jwtSecret) {
    return NextResponse.json(
      { error: "JWT_SECRET is not configured in environment variables." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const signupCheckoutToken = String(body?.signupCheckoutToken || "").trim();
  const planSlug = String(body?.planSlug || "").trim().toLowerCase();
  const billingPeriod = String(body?.period || "monthly") as BillingPeriod;

  if (!signupCheckoutToken) {
    return NextResponse.json(
      { error: "signupCheckoutToken is required." },
      { status: 400 }
    );
  }
  if (!planSlug) {
    return NextResponse.json({ error: "planSlug is required." }, { status: 400 });
  }
  if (!["monthly", "yearly"].includes(billingPeriod)) {
    return NextResponse.json(
      { error: "period must be monthly or yearly." },
      { status: 400 }
    );
  }

  let tokenPayload: SignupCheckoutTokenPayload;
  try {
    tokenPayload = jwt.verify(signupCheckoutToken, jwtSecret) as SignupCheckoutTokenPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired signup checkout token." },
      { status: 401 }
    );
  }

  await connectDB();

  const [plan, company, user] = await Promise.all([
    Plan.findOne({ slug: planSlug, isActive: true }).lean(),
    Company.findById(tokenPayload.companyId).lean(),
    User.findById(tokenPayload.userId).lean(),
  ]);

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }
  if (plan.price <= 0) {
    return NextResponse.json(
      { error: "This plan does not require payment." },
      { status: 400 }
    );
  }
  if (!company || !user) {
    return NextResponse.json({ error: "Signup context not found." }, { status: 404 });
  }
  if (user.companyId?.toString() !== company._id.toString()) {
    return NextResponse.json(
      { error: "Invalid signup context." },
      { status: 403 }
    );
  }

  const finalAmount = getAmountForPeriod(plan.price, billingPeriod);
  const stripe = new Stripe(stripeSecretKey);
  const baseUrl = getServerEnvVar("NEXT_PUBLIC_APP_URL") || req.nextUrl.origin;

  const payment = await PlanPayment.create({
    companyId: company._id,
    userId: user._id,
    planSlug: plan.slug,
    planTitle: plan.title,
    billingPeriod,
    amount: finalAmount,
    currency: "usd",
    status: "pending",
    metadata: {
      companyId: company._id.toString(),
      email: tokenPayload.email || user.email,
      signupFlow: "true",
    },
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: tokenPayload.email || user.email,
      payment_intent_data: {
        metadata: {
          paymentId: payment._id.toString(),
          companyId: company._id.toString(),
          planSlug: plan.slug,
          period: billingPeriod,
          signupFlow: "true",
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
      success_url: `${baseUrl}/login?signup_payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/login?signup_payment=cancelled`,
      metadata: {
        paymentId: payment._id.toString(),
        companyId: company._id.toString(),
        planSlug: plan.slug,
        period: billingPeriod,
        signupFlow: "true",
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
