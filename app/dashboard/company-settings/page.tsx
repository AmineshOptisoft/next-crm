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
import { Company } from "@/components/company-settings/types";

export default function CompanySettingsPage() {
    const router = useRouter();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [industries, setIndustries] = useState<Array<{ _id: string; name: string }>>([]);

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
            const response = await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const updated = await response.json();

                setCompany(updated);

                // Check if profile is complete
                if (updated.profileCompleted === true) {
                    alert("🎉 Company profile completed successfully! Redirecting to dashboard...");

                    // Immediate redirect with page reload
                    setSaving(false);
                    window.location.href = "/dashboard";
                    return; // Stop execution
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
                </TabsList>

                <TabsContent value="profile">
                    <CompanyProfile
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        handleSubmit={handleSubmit}
                        industries={industries}
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
            </Tabs>
        </div>
    );
}
