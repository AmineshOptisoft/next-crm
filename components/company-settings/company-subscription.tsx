"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building2, CreditCard } from "lucide-react";
import { Company } from "./types";

interface CompanySubscriptionProps {
    company: Company | null;
}

export function CompanySubscription({ company }: CompanySubscriptionProps) {
    if (!company) return null;

    return (
        <Card className="py-4">
            <CardHeader>
                <CardTitle>Subscription & Limits</CardTitle>
                <CardDescription>
                    View your current plan and usage limits
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold">Current Plan</h3>
                        <p className="text-sm text-muted-foreground">
                            Your subscription tier
                        </p>
                    </div>
                    <Badge variant="default" className="capitalize text-lg">
                        {company.plan}
                    </Badge>
                </div>

                {company.planExpiry && (
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Plan Expiry</h3>
                            <p className="text-sm text-muted-foreground">
                                Renewal date
                            </p>
                        </div>
                        <span className="font-medium">
                            {new Date(company.planExpiry).toLocaleDateString()}
                        </span>
                    </div>
                )}

                <div className="space-y-4">
                    <h3 className="font-semibold">Usage Limits</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">
                                    <Users className="h-4 w-4 inline mr-2" />
                                    Users
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {company.limits.users}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Maximum team members
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">
                                    <Building2 className="h-4 w-4 inline mr-2" />
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
                                    <CreditCard className="h-4 w-4 inline mr-2" />
                                    Deals
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {company.limits.deals}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Maximum deals
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="pt-4">
                    <Button variant="outline" disabled>
                        Upgrade Plan (Coming Soon)
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
