"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, CreditCard, CheckCircle2 } from "lucide-react";
import { Company } from "./types";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { cn } from "@/lib/utils";

interface CompanySubscriptionProps {
  company: Company | null;
}

type PlanFromDb = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  includedWithPlan: string[];
  isActive: boolean;
};

type BillingCycle = "monthly" | "yearly";

function mapCompanyPlanToSlug(plan?: string | null): string {
  const normalized = (plan || "").toLowerCase();
  if (["starter", "free"].includes(normalized)) return "starter";
  if (["growth", "professional"].includes(normalized)) return "growth";
  if (["pro-teams", "enterprise"].includes(normalized)) return "pro-teams";
  return "starter";
}

function mapSlugToCompanyPlan(slug: string): string {
  if (slug === "starter") return "starter";
  if (slug === "growth") return "professional";
  if (slug === "pro-teams") return "enterprise";
  return "starter";
}

function getPlanTierRank(slug: string): number {
  if (slug === "starter") return 1;
  if (slug === "growth") return 2;
  if (slug === "pro-teams") return 3;
  return 0;
}

type CheckoutSessionResponse = {
  sessionId?: string;
  checkoutUrl?: string | null;
  error?: string;
};

export function CompanySubscription({ company }: CompanySubscriptionProps) {
  if (!company) return null;

  const { mutate } = useSWRConfig();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanFromDb[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const handledSuccessSessionRef = useRef<string | null>(null);

  const currentPlanSlug = mapCompanyPlanToSlug(company.plan);
  const currentPlanRank = getPlanTierRank(currentPlanSlug);

  const currentPlanTitle = useMemo(() => {
    const current = plans.find((plan) => plan.slug === currentPlanSlug);
    return current?.title || company.plan || "Starter";
  }, [plans, currentPlanSlug, company.plan]);

  useEffect(() => {
    let mounted = true;

    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/plans", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch plans");
        const data = (await response.json()) as PlanFromDb[];
        const sorted = Array.isArray(data)
          ? data.filter((plan) => plan.isActive).sort((a, b) => a.price - b.price)
          : [];
        if (mounted) setPlans(sorted);
      } catch (error) {
        console.error("Failed to load plans:", error);
        toast.error("Failed to load subscription plans.");
      } finally {
        if (mounted) setPlansLoading(false);
      }
    };

    fetchPlans();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    const sessionId = searchParams.get("session_id");

    if (upgrade !== "success" || !sessionId) return;
    if (handledSuccessSessionRef.current === sessionId) return;
    handledSuccessSessionRef.current = sessionId;

    const confirmPayment = async () => {
      try {
        const response = await fetch("/api/subscription/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Could not verify Stripe payment.");
        }

        await mutate("/api/company/settings");
        toast.success("Payment confirmed and plan updated.");

        const url = new URL(window.location.href);
        url.searchParams.delete("upgrade");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      } catch (error: any) {
        toast.error(error.message || "Payment verification failed.");
      }
    };

    confirmPayment();
  }, [searchParams, mutate]);

  const handleSelectPlan = async (slug: string) => {
    const selectedPlanRank = getPlanTierRank(slug);
    if (selectedPlanRank > 0 && selectedPlanRank < currentPlanRank) {
      toast.error("You already have a higher tier plan.");
      return;
    }

    if (slug === currentPlanSlug) {
      toast.success("This is already your current plan.");
      return;
    }

    const selectedPlan = plans.find((plan) => plan.slug === slug);
    if (!selectedPlan) {
      toast.error("Selected plan not found.");
      return;
    }

    if (selectedPlan.price > 0) {
      await handlePaidPlanCheckout(selectedPlan.slug);
      return;
    }

    try {
      setUpdatingPlan(slug);
      const backendPlan = mapSlugToCompanyPlan(slug);

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

  const handlePaidPlanCheckout = async (slug: string) => {
    try {
      setUpdatingPlan(slug);

      const response = await fetch("/api/subscription/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planSlug: slug, period: billingCycle }),
      });

      const data = (await response.json()) as CheckoutSessionResponse;
      if (!response.ok) {
        throw new Error(data.error || "Unable to start Stripe checkout.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("Stripe checkout session was not created.");
    } catch (error: any) {
      toast.error(error.message || "Failed to open Stripe checkout.");
    } finally {
      setUpdatingPlan(null);
    }
  };

  const getDisplayedPrice = (monthlyPrice: number) => {
    if (billingCycle === "monthly") return monthlyPrice;
    return Math.round(monthlyPrice * 12 * (1 - 0.12));
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
              {currentPlanTitle}
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
        {/* Pricing table (DB-backed) */}
        {plansLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-80 rounded-2xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No plans found in database.
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs
              value={billingCycle}
              onValueChange={(value) => setBillingCycle(value as BillingCycle)}
              className="w-full"
            >
              <TabsList className="grid w-full max-w-[220px] grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = plan.slug === currentPlanSlug;
                const isLowerTierThanCurrent =
                  getPlanTierRank(plan.slug) > 0 &&
                  getPlanTierRank(plan.slug) < currentPlanRank;
                const isPopular = plan.slug === "growth";
                const displayedPrice = getDisplayedPrice(plan.price);
                const showDiscount = billingCycle === "yearly" && plan.price > 0;
                return (
                  <Card
                    key={plan.slug}
                    className={cn(
                      "relative flex flex-col rounded-2xl border pb-4 pt-6 transition-shadow transition-colors",
                      isCurrent
                        ? "bg-foreground text-background border-primary shadow-lg shadow-primary/40"
                        : "bg-card text-foreground border-border opacity-95 hover:shadow-md"
                    )}
                  >
                    <CardContent className="flex flex-1 flex-col gap-4 px-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isCurrent ? "text-background" : "text-foreground"
                            )}
                          >
                            {plan.title}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              isCurrent ? "text-background/70" : "text-muted-foreground"
                            )}
                          >
                            {plan.description}
                          </p>
                        </div>
                        {isPopular && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                              isCurrent
                                ? "bg-background text-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            Most popular
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline gap-2 text-3xl font-semibold">
                        <span>${displayedPrice}</span>
                        <span
                          className={cn(
                            "text-sm font-normal",
                            isCurrent ? "text-background/70" : "text-muted-foreground"
                          )}
                        >
                          {plan.price > 0
                            ? billingCycle === "monthly"
                              ? "/month"
                              : "/year"
                            : ""}
                        </span>
                        {showDiscount && (
                          <Badge className="bg-purple-500 text-white hover:bg-purple-500">-12%</Badge>
                        )}
                      </div>

                      {!isLowerTierThanCurrent && (
                        <Button
                          className="mt-4 w-full rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
                          type="button"
                          disabled={updatingPlan === plan.slug || isCurrent}
                          onClick={() => handleSelectPlan(plan.slug)}
                        >
                          {isCurrent
                            ? "Current plan"
                            : updatingPlan === plan.slug
                            ? "Updating..."
                            : `Choose ${plan.title}`}
                        </Button>
                      )}

                      <ul
                        className={cn(
                          "mt-4 space-y-2 text-sm",
                          isCurrent ? "text-background/90" : "text-muted-foreground"
                        )}
                      >
                        {plan.includedWithPlan.map((feature) => (
                          <li key={`${plan.slug}-${feature}`} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

     
      </CardContent>
    </Card>
  );
}
