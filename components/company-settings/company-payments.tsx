"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export function CompanyPayments() {
    const [paymentSettings, setPaymentSettings] = useState({
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

    useEffect(() => {
        fetchPaymentSettings();
    }, []);

    const fetchPaymentSettings = async () => {
        try {
            const response = await fetch("/api/payment-settings");
            if (response.ok) {
                const data = await response.json();
                setPaymentSettings({
                    ...data,
                    // Ensure nested objects exist to avoid crashes
                    razorpay: data.razorpay || { enabled: false, keyId: "", keySecret: "" },
                    stripe: data.stripe || { enabled: false, publishableKey: "", secretKey: "" },
                    paypal: data.paypal || { enabled: false, clientId: "", secret: "" },
                    tax: data.tax || { enabled: false, percentage: 0 },
                    convenienceFee: data.convenienceFee || { enabled: false, amount: 0 },
                    refund: data.refund || { enabled: false, maxDays: 0 },
                    invoice: data.invoice || { enabled: false, prefix: "" },
                });
            }
        } catch (error) {
            console.error("Error fetching payment settings:", error);
        }
    };

    const savePaymentSettings = async () => {
        try {
            const response = await fetch("/api/payment-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentSettings),
            });

            if (response.ok) {
                alert("Payment settings saved successfully!");
            } else {
                alert("Failed to save payment settings");
            }
        } catch (error) {
            console.error("Error saving payment settings:", error);
            alert("Error saving payment settings");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Configuration</CardTitle>
                <CardDescription>
                    Configure payment methods and gateways
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* --- Legacy Section --- */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Legacy Settings</h3>

                    {/* Pay Locally */}
                    <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">Pay Locally</Label>
                            <div className="text-sm text-muted-foreground">Enable cash/check payments</div>
                        </div>
                        <Switch
                            checked={paymentSettings.payLocally}
                            onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, payLocally: checked })}
                        />
                    </div>

                    {/* Fattmerchant */}
                    <div className="space-y-4 rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base font-semibold">Fattmerchant (Legacy)</Label>
                                <div className="text-sm text-muted-foreground">Original payment gateway integration</div>
                            </div>
                            <Switch
                                checked={paymentSettings.fattmerchantEnabled}
                                onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, fattmerchantEnabled: checked })}
                            />
                        </div>
                        {paymentSettings.fattmerchantEnabled && (
                            <div className="grid gap-4 md:grid-cols-2 pt-2">
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input
                                        type="password"
                                        value={paymentSettings.fattmerchantApiKey}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, fattmerchantApiKey: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Merchant ID</Label>
                                    <Input
                                        value={paymentSettings.fattmerchantMerchantId}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, fattmerchantMerchantId: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-border" />

                {/* --- General Settings --- */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">General Configuration</h3>
                    <div className="grid gap-6 md:grid-cols-2"> {/* Changed to grid-cols-2 for better layout */}
                        <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm col-span-2">
                            <div className="space-y-0.5">
                                <Label className="text-base font-semibold">Enable Payments</Label>
                                <div className="text-sm text-muted-foreground">Master switch for new payment system</div>
                            </div>
                            <Switch
                                checked={paymentSettings.paymentEnabled}
                                onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, paymentEnabled: checked })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                                value={paymentSettings.currency}
                                onValueChange={(val) => setPaymentSettings({ ...paymentSettings, currency: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                                <SelectContent>
                                    {["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"].map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select
                                value={paymentSettings.paymentMode}
                                onValueChange={(val) => setPaymentSettings({ ...paymentSettings, paymentMode: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="test">Test Mode</SelectItem>
                                    <SelectItem value="live">Live Mode</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Platform Commission (%)</Label>
                            <Input
                                type="number"
                                value={paymentSettings.platformCommission}
                                onChange={(e) => setPaymentSettings({ ...paymentSettings, platformCommission: Number(e.target.value) })}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Auto Capture</Label>
                                <div className="text-xs text-muted-foreground">Automatically capture payments</div>
                            </div>
                            <Switch
                                checked={paymentSettings.autoCapture}
                                onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, autoCapture: checked })}
                            />
                        </div>
                    </div>
                </div>

                {/* --- Payment Gateways --- */}
                {paymentSettings.paymentEnabled && (
                    <>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pt-4">Payment Gateways</h3>
                        <div className="grid gap-6">
                            {/* Razorpay */}
                            <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-blue-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base font-semibold">Razorpay</Label>
                                        <Badge variant="outline" className="text-xs">India</Badge>
                                    </div>
                                    <Switch
                                        checked={paymentSettings.razorpay?.enabled}
                                        onCheckedChange={(checked) => setPaymentSettings({
                                            ...paymentSettings,
                                            razorpay: { ...paymentSettings.razorpay, enabled: checked }
                                        })}
                                    />
                                </div>
                                {paymentSettings.razorpay?.enabled && (
                                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                                        <div className="space-y-2">
                                            <Label>Key ID</Label>
                                            <Input
                                                value={paymentSettings.razorpay.keyId}
                                                onChange={(e) => setPaymentSettings({
                                                    ...paymentSettings,
                                                    razorpay: { ...paymentSettings.razorpay, keyId: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Key Secret</Label>
                                            <Input
                                                type="password"
                                                value={paymentSettings.razorpay.keySecret}
                                                onChange={(e) => setPaymentSettings({
                                                    ...paymentSettings,
                                                    razorpay: { ...paymentSettings.razorpay, keySecret: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stripe */}
                            <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-indigo-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base font-semibold">Stripe</Label>
                                        <Badge variant="outline" className="text-xs">Global</Badge>
                                    </div>
                                    <Switch
                                        checked={paymentSettings.stripe?.enabled}
                                        onCheckedChange={(checked) => setPaymentSettings({
                                            ...paymentSettings,
                                            stripe: { ...paymentSettings.stripe, enabled: checked }
                                        })}
                                    />
                                </div>
                                {paymentSettings.stripe?.enabled && (
                                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                                        <div className="space-y-2">
                                            <Label>Publishable Key</Label>
                                            <Input
                                                value={paymentSettings.stripe.publishableKey}
                                                onChange={(e) => setPaymentSettings({
                                                    ...paymentSettings,
                                                    stripe: { ...paymentSettings.stripe, publishableKey: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secret Key</Label>
                                            <Input
                                                type="password"
                                                value={paymentSettings.stripe.secretKey}
                                                onChange={(e) => setPaymentSettings({
                                                    ...paymentSettings,
                                                    stripe: { ...paymentSettings.stripe, secretKey: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PayPal */}
                            <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-sky-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base font-semibold">PayPal</Label>
                                        <Badge variant="outline" className="text-xs">Global</Badge>
                                    </div>
                                    <Switch
                                        checked={paymentSettings.paypal?.enabled}
                                        onCheckedChange={(checked) => setPaymentSettings({
                                            ...paymentSettings,
                                            paypal: { ...paymentSettings.paypal, enabled: checked }
                                        })}
                                    />
                                </div>
                                {paymentSettings.paypal?.enabled && (
                                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                                        <div className="space-y-2">
                                            <Label>Client ID</Label>
                                            <Input
                                                value={paymentSettings.paypal.clientId}
                                                onChange={(e) => setPaymentSettings({
                                                    ...paymentSettings,
                                                    paypal: { ...paymentSettings.paypal, clientId: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secret</Label>
                                            <Input
                                                type="password"
                                                value={paymentSettings.paypal.secret}
                                                onChange={(e) => setPaymentSettings({
                                                    ...paymentSettings,
                                                    paypal: { ...paymentSettings.paypal, secret: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* --- Fees & Taxes --- */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fees & Taxes</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Tax */}
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">Tax</Label>
                                <Switch
                                    checked={paymentSettings.tax?.enabled}
                                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, tax: { ...paymentSettings.tax, enabled: checked } })}
                                />
                            </div>
                            {paymentSettings.tax?.enabled && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Percentage (%)</Label>
                                    <Input
                                        type="number"
                                        value={paymentSettings.tax.percentage}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, tax: { ...paymentSettings.tax, percentage: Number(e.target.value) } })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Convenience Fee */}
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">Convenience Fee</Label>
                                <Switch
                                    checked={paymentSettings.convenienceFee?.enabled}
                                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, convenienceFee: { ...paymentSettings.convenienceFee, enabled: checked } })}
                                />
                            </div>
                            {paymentSettings.convenienceFee?.enabled && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Amount</Label>
                                    <Input
                                        type="number"
                                        value={paymentSettings.convenienceFee.amount}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, convenienceFee: { ...paymentSettings.convenienceFee, amount: Number(e.target.value) } })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Refund Settings */}
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">Refund Policy</Label>
                                <Switch
                                    checked={paymentSettings.refund?.enabled}
                                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, refund: { ...paymentSettings.refund, enabled: checked } })}
                                />
                            </div>
                            {paymentSettings.refund?.enabled && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Max Days</Label>
                                    <Input
                                        type="number"
                                        value={paymentSettings.refund.maxDays}
                                        onChange={(e) => setPaymentSettings({ ...paymentSettings, refund: { ...paymentSettings.refund, maxDays: Number(e.target.value) } })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Invoice Settings --- */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Invoicing</h3>
                    <div className="flex items-center gap-6 rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                            <Label className="font-semibold">Enable Invoicing</Label>
                            <Switch
                                checked={paymentSettings.invoice?.enabled}
                                onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, invoice: { ...paymentSettings.invoice, enabled: checked } })}
                            />
                        </div>
                        {paymentSettings.invoice?.enabled && (
                            <div className="flex items-center gap-2 flex-1 max-w-xs">
                                <Label className="whitespace-nowrap">Invoice Prefix:</Label>
                                <Input
                                    value={paymentSettings.invoice.prefix}
                                    onChange={(e) => setPaymentSettings({ ...paymentSettings, invoice: { ...paymentSettings.invoice, prefix: e.target.value } })}
                                    placeholder="INV-"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-6 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t mt-4">
                    <Button onClick={savePaymentSettings} size="lg" className="shadow-lg">
                        <Save className="mr-2 h-4 w-4" />
                        Save Payment Configuration
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
