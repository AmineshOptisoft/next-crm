"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyProfile } from "@/components/company-settings/company-profile";
import { CompanySubscription } from "@/components/company-settings/company-subscription";
import { CompanyPreferences } from "@/components/company-settings/company-preferences";
import { CompanyPayments } from "@/components/company-settings/company-payments";
import { CompanyPromocodes } from "@/components/company-settings/company-promocodes";
import { CompanyServiceAreas } from "@/components/company-settings/company-service-areas";
import { CompanyZipCodes } from "@/components/company-settings/company-zip-codes";
import { CompanyAvailability } from "@/components/company-settings/company-availability";
import { CompanyMailSending } from "@/components/company-settings/company-mail-sending";
import { Company } from "@/components/company-settings/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

export default function CompanySettingsPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);

    // SWR for company settings – shared cache with layout / sidebar
    const { data: company, isLoading: loadingSettings, mutate: mutateSettings } = useSWR<Company>(
        "/api/company/settings",
        fetcher,
        { revalidateOnFocus: false }
    );

    // SWR for industries list – rarely changes, cache for 5 min
    const { data: industriesData } = useSWR<Array<{ _id: string; name: string }>>(
        "/api/industries",
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 300_000 }
    );

    const industries = industriesData || [];

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        industry: "",
        website: "",
        email: "",
        phone: "",
        logo: "",
        address: {
            street: "",
            city: "",
            state: "",
            country: "",
            zipCode: "",
            latitude: undefined as number | undefined,
            longitude: undefined as number | undefined,
        },
        settings: {
            timezone: "UTC",
            currency: "USD",
        },
    });

    // Sync formData when SWR fetches company
    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || "",
                description: company.description || "",
                industry: (company as any).industry || "",
                website: (company as any).website || "",
                email: (company as any).email || "",
                phone: (company as any).phone || "",
                logo: (company as any).logo || "",
                address: (company as any).address || {
                    street: "",
                    city: "",
                    state: "",
                    country: "",
                    zipCode: "",
                    latitude: undefined,
                    longitude: undefined,
                },
                settings: (company as any).settings || {
                    timezone: "UTC",
                    currency: "USD",
                },
            });
        }
    }, [company]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let finalFormData = { ...formData };

            // Upload logo first if a new one was selected
            if (selectedLogo) {
                const logoFormData = new FormData();
                logoFormData.append("file", selectedLogo);

                const uploadRes = await fetch("/api/company/upload-logo", {
                    method: "POST",
                    body: logoFormData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    finalFormData.logo = uploadData.url;
                    setFormData((prev) => ({ ...prev, logo: uploadData.url }));
                } else {
                    toast.error("Failed to upload logo. Saving other settings...");
                }
            }

            const response = await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalFormData),
            });

            if (response.ok) {
                const updated = await response.json();

                // Update the SWR cache so sidebar / layout picks up the change instantly
                await mutateSettings(updated, { revalidate: false });

                if (updated.profileCompleted === true) {
                    setIsRedirectDialogOpen(true);
                } else {
                    toast.warning("Settings saved, but profile is not complete yet. Please fill all required fields.");
                }
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const handleRedirect = () => {
        window.location.href = "/dashboard";
    };

    if (loadingSettings) {
        return (
            <div className="py-12 text-center">
                <p className="text-muted-foreground">Loading company settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
                <p className="text-muted-foreground">
                    Manage your company profile and preferences
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="w-full justify-start overflow-x-auto h-auto flex-nowrap p-1">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="availability">Availability</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="promocodes">Promocodes</TabsTrigger>
                    <TabsTrigger value="service-areas">Service Areas</TabsTrigger>
                    <TabsTrigger value="zip-codes">Zip Codes</TabsTrigger>
                    <TabsTrigger value="mail-sending">Mail Sending</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <CompanyProfile
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        handleSubmit={handleSubmit}
                        industries={industries}
                        selectedLogo={selectedLogo}
                        setSelectedLogo={setSelectedLogo}
                    />
                </TabsContent>

                <TabsContent value="subscription">
                    <CompanySubscription company={company ?? null} />
                </TabsContent>

                <TabsContent value="preferences">
                    <CompanyPreferences
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        handleSubmit={handleSubmit}
                    />
                </TabsContent>

                <TabsContent value="availability">
                    <CompanyAvailability />
                </TabsContent>

                <TabsContent value="payments">
                    <CompanyPayments />
                </TabsContent>

                <TabsContent value="promocodes">
                    <CompanyPromocodes />
                </TabsContent>

                <TabsContent value="service-areas">
                    <CompanyServiceAreas />
                </TabsContent>

                <TabsContent value="zip-codes">
                    <CompanyZipCodes />
                </TabsContent>

                <TabsContent value="mail-sending">
                    <CompanyMailSending company={company ?? null} />
                </TabsContent>
            </Tabs>

            <Dialog open={isRedirectDialogOpen} onOpenChange={setIsRedirectDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            <DialogTitle>Setup Complete!</DialogTitle>
                        </div>
                        <DialogDescription className="pt-2">
                            🎉 Company profile completed successfully! You are now ready to access your dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end">
                        <Button onClick={handleRedirect} className="w-full sm:w-auto">
                            Go to Dashboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
