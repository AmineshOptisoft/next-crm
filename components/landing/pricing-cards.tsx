"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/landing-content";

type Tab = "monthly" | "yearly";
type PricingPlan = (typeof PLANS)[number];
type PlanApiResponse = {
  title: string;
  slug: string;
  description: string;
  price: number;
  includedWithPlan: string[];
};

function buildPricingPlansFromApi(plans: PlanApiResponse[]): PricingPlan[] {
  return plans.map((plan) => {
    const isStarter = plan.slug === "starter";
    const isGrowth = plan.slug === "growth";
    const buttonText = isStarter
      ? "Start free"
      : isGrowth
        ? "Upgrade to Growth"
        : "Upgrade to Pro Teams";

    return {
      name: plan.title,
      info: plan.description,
      price: {
        monthly: plan.price,
        yearly: Math.round(plan.price * 12 * (1 - 0.12)),
      },
      features: plan.includedWithPlan.map((text) => ({ text })),
      btn: {
        text: buttonText,
        href: `/plan/${plan.slug}/signup`,
      },
    } as PricingPlan;
  });
}

export default function PricingCards() {
  const [activeTab, setActiveTab] = useState<Tab>("monthly");
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([...PLANS]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/plans", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as PlanApiResponse[];
        if (!Array.isArray(data) || data.length === 0) return;

        const mapped = buildPricingPlansFromApi(data);
        if (isMounted && mapped.length > 0) {
          setPricingPlans(mapped);
        }
      } catch {
        // Keep static fallback plans if API fetch fails.
      }
    };

    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Tabs defaultValue="monthly" className="w-full flex flex-col items-center">
      <TabsList>
        <TabsTrigger
          value="monthly"
          onClick={() => setActiveTab("monthly")}
          className="relative"
        >
          {activeTab === "monthly" && (
            <motion.div
              layoutId="active-tab-indicator"
              transition={{ type: "spring", bounce: 0.5 }}
              className="absolute top-0 left-0 w-full h-full bg-background shadow-sm rounded-md z-10"
            />
          )}
          <span className="z-20">Monthly</span>
        </TabsTrigger>
        <TabsTrigger
          value="yearly"
          onClick={() => setActiveTab("yearly")}
          className="relative"
        >
          {activeTab === "yearly" && (
            <motion.div
              layoutId="active-tab-indicator"
              transition={{ type: "spring", bounce: 0.5 }}
              className="absolute top-0 left-0 w-full h-full bg-background shadow-sm rounded-md z-10"
            />
          )}
          <span className="z-20">Yearly</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="monthly"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full md:gap-8 max-w-5xl mx-auto pt-6"
      >
        {pricingPlans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "flex flex-col w-full border-border rounded-xl",
              plan.name === "Growth" && "border-2 border-purple-500"
            )}
          >
            <CardHeader
              className={cn(
                "border-b border-border",
                plan.name === "Growth" ? "bg-purple-500/[0.07]" : "bg-foreground/[0.03]"
              )}
            >
              <CardTitle
                className={cn(plan.name !== "Growth" && "text-muted-foreground", "text-lg")}
              >
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.info}</CardDescription>
              <h5 className="text-3xl font-semibold">
                ${plan.price.monthly}
                <span className="text-base text-muted-foreground font-normal">
                  {plan.name !== "Starter" ? "/month" : ""}
                </span>
              </h5>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {plan.features.map((feature, index) => (
                (() => {
                  const tooltip = (feature as { tooltip?: string }).tooltip;
                  return (
                <div key={`${plan.name}-${index}`} className="flex items-center gap-2">
                  <CheckCircleIcon className="text-purple-500 w-4 h-4" />
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <p
                          className={cn(
                            tooltip && "border-b border-dashed border-border cursor-pointer"
                          )}
                        >
                          {feature.text}
                        </p>
                      </TooltipTrigger>
                      {tooltip && (
                        <TooltipContent>
                          <p>{tooltip}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
                  );
                })()
              ))}
            </CardContent>
            <CardFooter className="w-full mt-auto">
              <Link
                href={`${plan.btn.href}?period=monthly`}
                style={{ width: "100%" }}
                className={buttonVariants({
                  className:
                    plan.name === "Growth"
                      ? "bg-purple-500 hover:bg-purple-500/80 text-white"
                      : undefined,
                })}
              >
                {plan.btn.text}
              </Link>
            </CardFooter>
          </Card>
        ))}
      </TabsContent>

      <TabsContent
        value="yearly"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full md:gap-8 max-w-5xl mx-auto pt-6"
      >
        {pricingPlans.map((plan) => (
          <Card
            key={`${plan.name}-yearly`}
            className={cn(
              "flex flex-col w-full border-border rounded-xl",
              plan.name === "Growth" && "border-2 border-purple-500"
            )}
          >
            <CardHeader
              className={cn(
                "border-b border-border",
                plan.name === "Growth" ? "bg-purple-500/[0.07]" : "bg-foreground/[0.03]"
              )}
            >
              <CardTitle
                className={cn(plan.name !== "Growth" && "text-muted-foreground", "text-lg")}
              >
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.info}</CardDescription>
              <h5 className="text-3xl font-semibold flex items-end">
                ${plan.price.yearly}
                <span className="text-base text-muted-foreground font-normal">
                  {plan.name !== "Starter" ? "/year" : ""}
                </span>
                {plan.name !== "Starter" && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
                    className="px-2 py-0.5 ml-2 rounded-md bg-purple-500 text-white text-sm font-medium"
                  >
                    -12%
                  </motion.span>
                )}
              </h5>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {plan.features.map((feature, index) => (
                <div key={`${plan.name}-year-${index}`} className="flex items-center gap-2">
                  <CheckCircleIcon className="text-purple-500 w-4 h-4" />
                  <p>{feature.text}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter className="w-full mt-auto">
              <Link
                href={`${plan.btn.href}?period=yearly`}
                style={{ width: "100%" }}
                className={buttonVariants({
                  className:
                    plan.name === "Growth"
                      ? "bg-purple-500 hover:bg-purple-500/80 text-white"
                      : undefined,
                })}
              >
                {plan.btn.text}
              </Link>
            </CardFooter>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
