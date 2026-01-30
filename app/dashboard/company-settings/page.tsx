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

export default function CompanySettingsPage() {
    const router = useRouter();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [industries, setIndustries] = useState<Array<{ _id: string; name: string }>>([]);
    const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);

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

    useEffect(() => {
        fetchCompanySettings();
        fetchIndustries();
    }, []);

    const fetchIndustries = async () => {
        try {
            const response = await fetch("/api/industries");
            if (response.ok) {
                const data = await response.json();
                setIndustries(data);
            }
        } catch (error) {
            console.error("Error fetching industries:", error);
        }
    };

    const fetchCompanySettings = async () => {
        try {
            const response = await fetch("/api/company/settings");
            if (response.ok) {
                const data = await response.json();
                setCompany(data);
                setFormData({
                    name: data.name || "",
                    description: data.description || "",
                    industry: data.industry || "",
                    website: data.website || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    logo: data.logo || "",
                    address: data.address || {
                        street: "",
                        city: "",
                        state: "",
                        country: "",
                        zipCode: "",
                        latitude: undefined,
                        longitude: undefined,
                    },
                    settings: data.settings || {
                        timezone: "UTC",
                        currency: "USD",
                    },
                });
            }
        } catch (error) {
            console.error("Error fetching company settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let finalFormData = { ...formData };

            // If a new logo was selected, upload it first
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
                    // Update current state too
                    setFormData(prev => ({ ...prev, logo: uploadData.url }));
                } else {
                    console.error("Failed to upload company logo");
                    // Continue anyway or handle error? Let's alert.
                    alert("Failed to upload logo. Will try to save other settings.");
                }
            }

            const response = await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalFormData),
            });

            if (response.ok) {
                const updated = await response.json();

                setCompany(updated);

                // Check if profile is complete
                if (updated.profileCompleted === true) {
                    setIsRedirectDialogOpen(true);
                    setSaving(false);
                } else {
                    alert("Settings updated, but profile not complete yet. Please fill all required fields.");
                }
            } else {
                const error = await response.json();
                console.error("API Error:", error);
                alert(error.error || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            alert("Failed to update settings. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const handleRedirect = () => {
        window.location.href = "/dashboard";
    };

    if (loading) {
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
                <TabsList>
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
                    <CompanySubscription company={company} />
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
                    <CompanyMailSending company={company} />
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
