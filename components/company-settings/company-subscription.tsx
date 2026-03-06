"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building2, CreditCard, CheckCircle2 } from "lucide-react";
import { Company } from "./types";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

interface CompanySubscriptionProps {
  company: Company | null;
}

const pricingFeatures = [
  "Access to 60+ premium Component Blocks",
  "Access to 12+ ready-to-use Templates",
  "Copy and paste, no complexity",
  "Built with Next.js, React, Tailwind CSS & Framer Motion",
  "Fully responsive and customizable",
];

type UIPlanId = "free" | "annual" | "lifetime";

function mapCompanyPlanToUIPlan(plan?: string | null): UIPlanId {
  if (!plan) return "free";
  const normalized = plan.toLowerCase();
  if (["annual", "yearly", "starter", "professional"].includes(normalized)) {
    return "annual";
  }
  if (["lifetime", "one-time", "enterprise"].includes(normalized)) {
    return "lifetime";
  }
  return "free";
}

function mapUIPlanToCompanyPlan(plan: UIPlanId): string {
  switch (plan) {
    case "annual":
      return "professional";
    case "lifetime":
      return "enterprise";
    case "free":
    default:
      return "free";
  }
}

export function CompanySubscription({ company }: CompanySubscriptionProps) {
  if (!company) return null;

  const { mutate } = useSWRConfig();
  const [updatingPlan, setUpdatingPlan] = useState<UIPlanId | null>(null);

  const currentPlanId = mapCompanyPlanToUIPlan(company.plan);

  const handleSelectPlan = async (plan: UIPlanId) => {
    if (plan === currentPlanId) {
      toast.success("This is already your current plan.");
      return;
    }

    try {
      setUpdatingPlan(plan);

      const backendPlan = mapUIPlanToCompanyPlan(plan);

      const response = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: backendPlan }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to update subscription plan.");
      }

      const updatedCompany = await response.json();

      await mutate("/api/company/settings", updatedCompany, { revalidate: false });

      toast.success("Subscription plan updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update subscription plan.");
    } finally {
      setUpdatingPlan(null);
    }
  };

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Subscription & Limits</CardTitle>
        <CardDescription>
          Choose the plan that fits your team and view your usage limits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Current Plan</h3>
            <p className="text-sm text-muted-foreground">
              Your subscription tier
            </p>
          </div>
          <div className="flex items-center gap-3">
            {company.planExpiry && (
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Renews on</p>
                <p>
                  {new Date(company.planExpiry).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            <Badge variant="default" className="capitalize text-sm">
              {company.plan || "Free"}
            </Badge>
          </div>
        </div>
   {/* Usage limits (kept from previous design) */}
   <div className="space-y-4">
          <h3 className="font-semibold">Usage Limits</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <Users className="mr-2 inline h-4 w-4" />
                  Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.limits.users}</div>
                <p className="text-xs text-muted-foreground">
                  Maximum team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <Building2 className="mr-2 inline h-4 w-4" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {company.limits.contacts}
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum contacts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <CreditCard className="mr-2 inline h-4 w-4" />
                  Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.limits.deals}</div>
                <p className="text-xs text-muted-foreground">
                  Maximum deals
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Pricing table */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free plan */}
          <Card
            className={`flex flex-col rounded-2xl border pb-4 pt-6 transition-shadow transition-colors ${
              currentPlanId === "free"
                ? "bg-foreground text-background border-primary shadow-lg shadow-primary/40"
                : "bg-card text-foreground border-border opacity-90 hover:shadow-md"
            }`}
          >
            <CardContent className="flex flex-1 flex-col gap-4 px-6">
              <div className="space-y-1">
                <p
                  className={`text-sm font-medium ${
                    currentPlanId === "free"
                      ? "text-background"
                      : "text-foreground"
                  }`}
                >
                  Free
                </p>
                <p className="text-xs text-muted-foreground">
                  Access to all free components
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-1 text-3xl font-semibold">
                <span>$0</span>
                <span
                  className={`text-sm font-normal line-through ${
                    currentPlanId === "free"
                      ? "text-background/70"
                      : "text-muted-foreground"
                  }`}
                >
                  $0
                </span>
              </div>
              <Button
                className="mt-4 w-full rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
                type="button"
                disabled={updatingPlan === "free"}
                onClick={() => handleSelectPlan("free")}
              >
                {currentPlanId === "free"
                  ? "Current plan"
                  : updatingPlan === "free"
                  ? "Updating..."
                  : "Browse free components"}
              </Button>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Access to all free components</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Copy and paste, no complexity</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>
                    Built with Next.js, React, Tailwind CSS &amp; Framer Motion
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Fully responsive and customizable</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Documentation and examples included</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Questions? Chat with us.
              </p>
            </CardContent>
          </Card>

          {/* Annual plan */}
          <Card
            className={`flex flex-col rounded-2xl border pb-4 pt-6 transition-shadow transition-colors ${
              currentPlanId === "annual"
                ? "bg-foreground text-background border-primary shadow-lg shadow-primary/40"
                : "bg-card text-foreground border-border opacity-90 hover:shadow-md"
            }`}
          >
            <CardContent className="flex flex-1 flex-col gap-4 px-6">
              <div className="space-y-1">
                <p
                  className={`text-sm font-medium ${
                    currentPlanId === "annual"
                      ? "text-background"
                      : "text-foreground"
                  }`}
                >
                  Annual Access
                </p>
                <p
                  className={`text-xs ${
                    currentPlanId === "annual"
                      ? "text-background/70"
                      : "text-muted-foreground"
                  }`}
                >
                  Paid yearly
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-1 text-3xl font-semibold">
                <span>$169</span>
                <span
                  className={`text-sm font-normal line-through ${
                    currentPlanId === "annual"
                      ? "text-background/70"
                      : "text-muted-foreground"
                  }`}
                >
                  $249
                </span>
              </div>
              <Button
                className="mt-4 w-full rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
                type="button"
                disabled={updatingPlan === "annual"}
                onClick={() => handleSelectPlan("annual")}
              >
                {currentPlanId === "annual"
                  ? "Current plan"
                  : updatingPlan === "annual"
                  ? "Updating..."
                  : "Get Annual Access"}
              </Button>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {pricingFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Cancel subscription anytime</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Questions? Chat with us.
              </p>
            </CardContent>
          </Card>

          {/* Lifetime plan */}
          <Card
            className={`relative flex flex-col rounded-2xl border pb-4 pt-6 transition-shadow transition-colors ${
              currentPlanId === "lifetime"
                ? "bg-foreground text-background border-primary shadow-lg shadow-primary/40"
                : "bg-card text-foreground border-border opacity-95 hover:shadow-md"
            }`}
          >
            <CardContent className="flex flex-1 flex-col gap-4 px-6">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${
                      currentPlanId === "lifetime"
                        ? "text-background"
                        : "text-foreground"
                    }`}
                  >
                    Lifetime Access
                  </p>
                  <p
                    className={`text-xs ${
                      currentPlanId === "lifetime"
                        ? "text-background/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    One-time Purchase
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    currentPlanId === "lifetime"
                      ? "bg-background text-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  Most popular
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-1 text-3xl font-semibold">
                <span>$199</span>
                <span
                  className={`text-sm font-normal line-through ${
                    currentPlanId === "lifetime"
                      ? "text-background/70"
                      : "text-muted-foreground"
                  }`}
                >
                  $299
                </span>
              </div>
              <Button
                className="mt-4 w-full rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
                type="button"
                disabled={updatingPlan === "lifetime"}
                onClick={() => handleSelectPlan("lifetime")}
              >
                {currentPlanId === "lifetime"
                  ? "Current plan"
                  : updatingPlan === "lifetime"
                  ? "Updating..."
                  : "Get Lifetime Access"}
              </Button>
              <ul
                className={`mt-4 space-y-2 text-sm ${
                  currentPlanId === "lifetime"
                    ? "text-background/90"
                    : "text-muted-foreground"
                }`}
              >
                {pricingFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div
                className={`mt-4 border-t pt-4 text-sm ${
                  currentPlanId === "lifetime"
                    ? "border-background/20"
                    : "border-border"
                }`}
              >
                <p
                  className={`flex items-center gap-2 ${
                    currentPlanId === "lifetime"
                      ? "text-background"
                      : "text-foreground"
                  }`}
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  Everything in Annual Plan
                </p>
              </div>
              <p
                className={`mt-4 text-xs ${
                  currentPlanId === "lifetime"
                    ? "text-background/70"
                    : "text-muted-foreground"
                }`}
              >
                Questions? Chat with us.
              </p>
            </CardContent>
          </Card>
        </div>

     
      </CardContent>
    </Card>
  );
}
