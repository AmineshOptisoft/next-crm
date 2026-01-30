"use client";

import { Button } from "@/components/ui/button";
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

interface CompanyPreferencesProps {
    formData: any;
    setFormData: (data: any) => void;
    saving: boolean;
    handleSubmit: (e: React.FormEvent) => void;
}

export function CompanyPreferences({ formData, setFormData, saving, handleSubmit }: CompanyPreferencesProps) {
    return (
        <form onSubmit={handleSubmit}>
            <Card className="py-4">
                <CardHeader>
                    <CardTitle>Company Preferences</CardTitle>
                    <CardDescription>
                        Configure default settings for your organization
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <Select
                                value={formData.settings.timezone}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        settings: { ...formData.settings, timezone: value },
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                    <SelectItem value="America/New_York">
                                        Eastern Time (ET)
                                    </SelectItem>
                                    <SelectItem value="America/Chicago">
                                        Central Time (CT)
                                    </SelectItem>
                                    <SelectItem value="America/Denver">
                                        Mountain Time (MT)
                                    </SelectItem>
                                    <SelectItem value="America/Los_Angeles">
                                        Pacific Time (PT)
                                    </SelectItem>
                                    <SelectItem value="Europe/London">
                                        London (GMT)
                                    </SelectItem>
                                    <SelectItem value="Asia/Kolkata">
                                        India (IST)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Default Currency</Label>
                            <Select
                                value={formData.settings.currency}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        settings: { ...formData.settings, currency: value },
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? "Saving..." : "Save Preferences"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
