"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Server, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Company } from "./types";

interface CompanyMailSendingProps {
    company: Company | null;
}

export function CompanyMailSending({ company }: CompanyMailSendingProps) {
    const [sendingMethod, setSendingMethod] = useState<"smtp" | "gmail">(
        company?.mailConfig?.provider || "smtp"
    );
    const [smtpConfig, setSmtpConfig] = useState({
        host: company?.mailConfig?.smtp?.host || "",
        port: company?.mailConfig?.smtp?.port?.toString() || "",
        username: company?.mailConfig?.smtp?.username || "",
        password: company?.mailConfig?.smtp?.password || "",
        fromEmail: company?.mailConfig?.smtp?.fromEmail || "",
        fromName: company?.mailConfig?.smtp?.fromName || "",
    });
    const [isSaving, setIsSaving] = useState(false);

    // Check Gmail connection from props
    const isGmailConnected = !!company?.mailConfig?.gmail?.email;
    const connectedGmailEmail = company?.mailConfig?.gmail?.email;

    const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSmtpConfig({ ...smtpConfig, [e.target.name]: e.target.value });
    };

    const handleSaveSmtp = async () => {
        // Warn if Gmail is currently connected
        if (isGmailConnected && company?.mailConfig?.provider === "gmail") {
            if (!confirm("Saving SMTP settings will automatically disconnect your Gmail account. Do you want to continue?")) {
                return;
            }
        }

        setIsSaving(true);
        try {
            // Update company settings using the same endpoint but specifically for mailConfig
            // Since PUT /api/company/settings expects full body or merges, we should be careful.
            // The existing PUT handler updates generic fields passed in body. 
            // We need to match the structure expected by the PUT route. 
            // The PUT route takes `body` and does `{ $set: updateData }`.

            const payload = {
                mailConfig: {
                    provider: "smtp",
                    smtp: {
                        ...smtpConfig,
                        port: parseInt(smtpConfig.port) || 587
                    },
                    // Automatically disconnect Gmail when SMTP is enabled
                    gmail: {
                        accessToken: null,
                        refreshToken: null,
                        email: null
                    }
                }
            };

            const res = await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save settings");

            const message = isGmailConnected
                ? "SMTP settings saved successfully. Gmail has been disconnected."
                : "SMTP settings saved successfully.";
            toast.success(message);
            // Reload to reflect changes
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save SMTP settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnectGmail = async () => {
        // Warn if SMTP is currently active
        if (company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host) {
            if (!confirm("Connecting Gmail will automatically switch from SMTP to Gmail as your email provider. Do you want to continue?")) {
                return;
            }
        }

        // First set provider to gmail, then redirect to auth
        try {
            const payload = {
                mailConfig: {
                    provider: "gmail"
                }
            };
            await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            // Now redirect to auth endpoint
            window.location.href = "/api/gmail/auth";
        } catch (error) {
            console.error("Failed to update provider", error);
            // Still redirect even if update fails
            window.location.href = "/api/gmail/auth";
        }
    };

    const handleDisconnectGmail = async () => {
        if (!confirm("Are you sure you want to disconnect Gmail?")) return;

        setIsSaving(true);
        try {
            const payload = {
                mailConfig: {
                    provider: "smtp",
                    smtp: company?.mailConfig?.smtp || {
                        host: "",
                        port: 587,
                        username: "",
                        password: "",
                        fromEmail: "",
                        fromName: ""
                    },
                    gmail: {
                        accessToken: null,
                        refreshToken: null,
                        email: null
                    }
                }
            };

            const res = await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Gmail disconnected successfully");
                // Use a short delay before reload to let the toast be seen
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to disconnect Gmail");
            }
        } catch (error) {
            console.error("Disconnect error:", error);
            toast.error("An error occurred while disconnecting");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="py-4">
            <CardHeader>
                <CardTitle>Mail Sending Configuration</CardTitle>
                <CardDescription>
                    Choose how you want to send emails from your CRM.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* SMTP Card */}
                    <div
                        onClick={() => {
                            // Disable click if Gmail is active
                            if (isGmailConnected && company?.mailConfig?.provider === "gmail") {
                                toast.info("Gmail is currently active. Disconnect Gmail first to use SMTP.");
                                return;
                            }
                            setSendingMethod("smtp");
                        }}
                        className={`relative flex items-center gap-3 px-5 py-3 border-2 rounded-lg transition-all ${
                            // If Gmail is active, show disabled state
                            isGmailConnected && company?.mailConfig?.provider === "gmail"
                                ? "opacity-50 cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
                                : sendingMethod === "smtp"
                                    ? "cursor-pointer border-cyan-500 bg-cyan-50 text-cyan-900"
                                    : "cursor-pointer border-zinc-200 hover:border-zinc-300 text-zinc-600"
                            }`}
                    >
                        <div className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center ${isGmailConnected && company?.mailConfig?.provider === "gmail"
                            ? "border-zinc-300"
                            : sendingMethod === "smtp" ? "border-cyan-500" : "border-zinc-400"
                            }`}>
                            {sendingMethod === "smtp" && !(isGmailConnected && company?.mailConfig?.provider === "gmail") && (
                                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                            )}
                        </div>
                        <Server className="h-4 w-4" />
                        <span className="font-medium text-sm">SMTP Server</span>
                        {company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host && (
                            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                Active
                            </span>
                        )}
                        {isGmailConnected && company?.mailConfig?.provider === "gmail" && (
                            <span className="ml-auto text-xs bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                                Disabled
                            </span>
                        )}
                    </div>

                    {/* Gmail Card */}
                    <div
                        onClick={() => {
                            // Disable click if SMTP is active
                            if (company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host) {
                                toast.info("SMTP is currently active. Save Gmail settings to switch providers.");
                                return;
                            }
                            setSendingMethod("gmail");
                        }}
                        className={`relative flex items-center gap-3 px-5 py-3 border-2 rounded-lg transition-all ${
                            // If SMTP is active, show disabled state
                            company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host
                                ? "opacity-50 cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
                                : sendingMethod === "gmail"
                                    ? "cursor-pointer border-cyan-500 bg-cyan-50 text-cyan-900"
                                    : "cursor-pointer border-zinc-200 hover:border-zinc-300 text-zinc-600"
                            }`}
                    >
                        <div className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center ${company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host
                            ? "border-zinc-300"
                            : sendingMethod === "gmail" ? "border-cyan-500" : "border-zinc-400"
                            }`}>
                            {sendingMethod === "gmail" && !(company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host) && (
                                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                            )}
                        </div>
                        <Mail className="h-4 w-4" />
                        <span className="font-medium text-sm">Gmail / Google</span>
                        {isGmailConnected && company?.mailConfig?.provider === "gmail" && (
                            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                Active
                            </span>
                        )}
                        {company?.mailConfig?.provider === "smtp" && company?.mailConfig?.smtp?.host && (
                            <span className="ml-auto text-xs bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                                Disabled
                            </span>
                        )}
                    </div>
                </div>

                {/* Info box explaining mutual exclusivity */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                        <strong>Note:</strong> Only one email provider can be active at a time. Enabling one will automatically disable the other.
                    </p>
                </div>

                <Separator />

                {sendingMethod === "smtp" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SMTP Host</Label>
                                <Input
                                    name="host"
                                    placeholder="smtp.example.com"
                                    value={smtpConfig.host}
                                    onChange={handleSmtpChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SMTP Port</Label>
                                <Input
                                    name="port"
                                    placeholder="587"
                                    value={smtpConfig.port}
                                    onChange={handleSmtpChange}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    name="username"
                                    placeholder="apikey"
                                    value={smtpConfig.username}
                                    onChange={handleSmtpChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    name="password"
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    value={smtpConfig.password}
                                    onChange={handleSmtpChange}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>From Email</Label>
                                <Input
                                    name="fromEmail"
                                    placeholder="noreply@yourcompany.com"
                                    value={smtpConfig.fromEmail}
                                    onChange={handleSmtpChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>From Name</Label>
                                <Input
                                    name="fromName"
                                    placeholder="Your Company Name"
                                    value={smtpConfig.fromName}
                                    onChange={handleSmtpChange}
                                />
                            </div>
                        </div>
                        <div className="pt-2">
                            <Button onClick={handleSaveSmtp} disabled={isSaving} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                                {isSaving ? "Saving Configuration..." : "Save SMTP Settings"}
                            </Button>
                        </div>
                    </div>
                )}

                {sendingMethod === "gmail" && (
                    <div className="space-y-6 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
                            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-900">Google Sending Limits</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Gmail has a sending limit of 500 emails per day for free accounts and 2,000 for Workspace accounts.
                                    For higher volumes, we recommend using SMTP.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-4 py-6 border-2 border-dashed rounded-xl">
                            <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </div>
                            {isGmailConnected ? (
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-zinc-900">Connected to Google</h3>
                                    <p className="text-sm text-zinc-500 mb-4">{connectedGmailEmail}</p>
                                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleDisconnectGmail}>
                                        Disconnect Account
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-zinc-900">Connect your Google Account</h3>
                                    <p className="text-sm text-zinc-500 mb-4">Allow CRM to send emails on your behalf</p>
                                    <Button onClick={handleConnectGmail} className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 font-medium shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" className="mr-2">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign in with Google
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
