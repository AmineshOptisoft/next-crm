"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const TIME_SLOTS = [
    "12:00 AM", "01:00 AM", "02:00 AM", "03:00 AM", "04:00 AM", "05:00 AM",
    "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
    "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM"
];

interface DaySchedule {
    day: string;
    isOpen: boolean;
    startTime: string;
    endTime: string;
}

export function CompanyAvailability() {
    const [schedule, setSchedule] = useState<DaySchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMasterAvailability();
    }, []);

    const fetchMasterAvailability = async () => {
        try {
            const response = await fetch("/api/company/availability");
            if (response.ok) {
                const data = await response.json();
                setSchedule(data);
            }
        } catch (error) {
            console.error("Error fetching master availability:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/company/availability", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ masterAvailability: schedule }),
            });

            if (response.ok) {
                alert("Master availability updated successfully!");
            } else {
                const error = await response.json();
                alert(error.error || "Failed to update availability");
            }
        } catch (error) {
            console.error("Error saving master availability:", error);
            alert("Error saving availability");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="py-4">
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="py-4">
            <CardHeader>
                <CardTitle>Master Availability</CardTitle>
                <CardDescription>
                    Set company-wide working hours. This schedule will restrict all technicians' availability.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Technicians can only work on days marked as open, and their hours must fall within the time ranges you set here.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3">
                    {schedule.map((slot, index) => (
                        <div
                            key={slot.day}
                            className="flex items-center justify-between border rounded-lg p-4 bg-background hover:bg-muted/50 transition-colors"
                        >
                            <div className="w-32 font-medium">{slot.day}</div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor={`switch-${slot.day}`} className="text-sm text-muted-foreground">
                                    {slot.isOpen ? "Open" : "Closed"}
                                </Label>
                                <Switch
                                    id={`switch-${slot.day}`}
                                    checked={slot.isOpen}
                                    onCheckedChange={(checked) => updateSchedule(index, "isOpen", checked)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Select
                                    value={slot.startTime}
                                    onValueChange={(val) => updateSchedule(index, "startTime", val)}
                                    disabled={!slot.isOpen}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-muted-foreground">to</span>
                                <Select
                                    value={slot.endTime}
                                    onValueChange={(val) => updateSchedule(index, "endTime", val)}
                                    disabled={!slot.isOpen}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving} size="lg">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save Master Availability"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
