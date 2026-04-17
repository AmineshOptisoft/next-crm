import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { PlanPayment } from "@/app/models/PlanPayment";
import { Company } from "@/app/models/Company";
import { Plan } from "@/app/models/Plan";
import { Payment } from "@/app/models/Payment";
import { getServerEnvVar } from "@/lib/server-env";

type BillingPeriod = "monthly" | "yearly";

function mapPlanSlugToCompanyPlan(planSlug: string) {
  if (planSlug === "starter") return "starter";
  if (planSlug === "growth") return "professional";
  if (planSlug === "pro-teams") return "enterprise";
  return "starter";
}

function getNewPlanExpiry(currentExpiry: Date | null | undefined, period: BillingPeriod) {
  const now = new Date();
  const baseDate =
    currentExpiry && currentExpiry.getTime() > now.getTime()
      ? new Date(currentExpiry)
      : now;

  if (period === "yearly") {
    baseDate.setFullYear(baseDate.getFullYear() + 1);
    return baseDate;
  }

  baseDate.setMonth(baseDate.getMonth() + 1);
  return baseDate;
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = getServerEnvVar("STRIPE_SECRET_KEY");
  const webhookSecret = getServerEnvVar("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (!paymentId) return NextResponse.json({ received: true });

      const payment = await PlanPayment.findById(paymentId);
      if (!payment) return NextResponse.json({ received: true });

      if (payment.status !== "paid") {
        payment.status = "paid";
        payment.paidAt = new Date();
        payment.stripeCheckoutSessionId =
          session.id || payment.stripeCheckoutSessionId;
        payment.stripePaymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : payment.stripePaymentIntentId;
        payment.stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : payment.stripeCustomerId;

        if (typeof session.amount_total === "number") {
          payment.amount = session.amount_total / 100;
        }

        await payment.save();

        const plan = await Plan.findOne({ slug: payment.planSlug }).select("_id").lean();
        if (plan) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : payment.stripePaymentIntentId || "";

          // Create an immutable payment ledger record on successful payment.
          await Payment.findOneAndUpdate(
            { paymentId: paymentIntentId || session.id },
            {
              $setOnInsert: {
                paymentId: paymentIntentId || session.id,
                planId: plan._id,
                companyId: payment.companyId,
                userId: payment.userId,
                amount: typeof session.amount_total === "number" ? session.amount_total / 100 : payment.amount,
                currency: session.currency || payment.currency || "usd",
                duration: payment.billingPeriod,
                status: "succeeded",
                provider: "stripe",
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: paymentIntentId || undefined,
                stripeCustomerId:
                  typeof session.customer === "string" ? session.customer : payment.stripeCustomerId,
                paidAt: new Date(),
              },
            },
            { upsert: true, new: false }
          );
        }

        const company = await Company.findById(payment.companyId);
        if (company) {
          company.plan = mapPlanSlugToCompanyPlan(payment.planSlug);
          company.planExpiry = getNewPlanExpiry(
            company.planExpiry,
            payment.billingPeriod as BillingPeriod
          );
          await company.save();
        }
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (paymentId) {
        await PlanPayment.findByIdAndUpdate(paymentId, {
          status: "expired",
          stripeCheckoutSessionId: session.id,
        });
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.paymentId) {
        await PlanPayment.findByIdAndUpdate(intent.metadata.paymentId, {
          status: "failed",
          stripePaymentIntentId: intent.id,
        });
      }
    }
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
