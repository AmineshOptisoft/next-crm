import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { getServerEnvVar } from "@/lib/server-env";
import { PlanPayment } from "@/app/models/PlanPayment";
import { Plan } from "@/app/models/Plan";
import { Payment } from "@/app/models/Payment";
import { Company } from "@/app/models/Company";

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
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can confirm plan payments." },
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
  const sessionId = String(body?.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Stripe session not found." }, { status: 404 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Payment is not marked as paid by Stripe yet." },
      { status: 400 }
    );
  }

  await connectDB();

  const paymentIdFromMeta = session.metadata?.paymentId;
  const payment = paymentIdFromMeta
    ? await PlanPayment.findById(paymentIdFromMeta)
    : await PlanPayment.findOne({ stripeCheckoutSessionId: session.id });

  if (!payment) {
    return NextResponse.json({ error: "Pending payment record not found." }, { status: 404 });
  }

  if (payment.companyId.toString() !== user.companyId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const wasAlreadyPaid = payment.status === "paid";

  payment.status = "paid";
  payment.paidAt = payment.paidAt || new Date();
  payment.stripeCheckoutSessionId = session.id || payment.stripeCheckoutSessionId;
  payment.stripePaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : payment.stripePaymentIntentId;
  payment.stripeCustomerId =
    typeof session.customer === "string" ? session.customer : payment.stripeCustomerId;
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

    await Payment.findOneAndUpdate(
      { paymentId: paymentIntentId || session.id },
      {
        $setOnInsert: {
          paymentId: paymentIntentId || session.id,
          planId: plan._id,
          companyId: payment.companyId,
          userId: payment.userId,
          amount:
            typeof session.amount_total === "number"
              ? session.amount_total / 100
              : payment.amount,
          currency: session.currency || payment.currency || "usd",
          duration: payment.billingPeriod,
          status: "succeeded",
          provider: "stripe",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId || undefined,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : payment.stripeCustomerId,
          paidAt: payment.paidAt || new Date(),
        },
      },
      { upsert: true }
    );
  }

  if (!wasAlreadyPaid) {
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

  return NextResponse.json({ success: true, status: payment.status });
}
