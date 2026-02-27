"use client";

import React, { useState, useEffect } from "react";
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit2,
    Trash2,
    Eye,
    Mail,
    Filter,
    ArrowUpDown,
    Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Clock, Bell } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

// Mock data for existing emails
const mockEmails = [
    { id: "1", name: "Welcome Sequence - Step 1", subject: "Welcome to the family!", status: "sent", sentAt: "2024-01-20", opens: 450, clicks: 120 },
    { id: "2", name: "Booking Confirmed", subject: "Your booking is confirmed", status: "active", sentAt: "2024-01-25", opens: 890, clicks: 340 },
    { id: "3", name: "Service Feedback", subject: "How did we do?", status: "draft", sentAt: "-", opens: 0, clicks: 0 },
    { id: "4", name: "Monthly Newsletter - Feb", subject: "What's new this month", status: "scheduled", sentAt: "2024-02-01", opens: 0, clicks: 0 },
];

export default function EmailBuilderListPage() {
    // Check permissions for this module
    const permissions = usePermissions("email-builder");
    
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
    const [selectedEmailForReminder, setSelectedEmailForReminder] = useState<string | null>(null);
    const [emails, setEmails] = useState<any[]>([]);
    const [loadingEmails, setLoadingEmails] = useState(true);

    // Test Mail States
    const [selectedCampaignForTest, setSelectedCampaignForTest] = useState<any | null>(null);
    const [testEmail, setTestEmail] = useState("");
    const [testData, setTestData] = useState({
        firstname: "John",
        lastname: "Doe",
        service_name: "Deep Cleaning",
        units: "1",
        price: "$150",
        booking_date: new Date().toLocaleDateString()
    });
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    const [reminders, setReminders] = useState([
        { id: 1, label: "First", unit: "Hours", value: "6", enabled: true },
        { id: 2, label: "Second", unit: "Minutes", value: "8", enabled: true },
        { id: 3, label: "Third", unit: "Days", value: "9", enabled: true },
        { id: 4, label: "Fourth", unit: "Minutes", value: "11", enabled: true },
        { id: 5, label: "Fifth", unit: "Hours", value: "14", enabled: true },
    ]);

    // Fetch campaigns and templates in parallel via SWR.
    const { data: rawEmails, error: emailsError, isLoading: loadingEmailsData, mutate: mutateEmails } = useSWR('/api/email-campaigns', fetcher, {
        revalidateOnFocus: false,
    });
    const { data: rawTemplates } = useSWR('/api/email-templates', fetcher, {
        revalidateOnFocus: false,
    });

    const [templatesList, setTemplatesList] = useState<any[]>([]);

    // Mirror to state if the SWR fetch changes.
    useEffect(() => {
        if (rawEmails?.success) {
            setEmails(rawEmails.data);
            setLoadingEmails(false);
        } else if (rawEmails) {
             setLoadingEmails(false);
        }
    }, [rawEmails]);

    useEffect(() => {
        if (rawTemplates?.success) {
             setTemplatesList(rawTemplates.data);
        }
    }, [rawTemplates]);

    // Backward compatibility for components that might call fetchEmails directly
    const fetchEmails = async () => {
        await mutateEmails();
    };

    const handleToggleReminder = (id: number) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    };

    const handleUpdateReminder = (id: number, field: "unit" | "value", newValue: string) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, [field]: newValue } : r));
    };

    const handleResetReminders = () => {
        setReminders(reminders.map(r => ({ ...r, enabled: false })));
        toast.info("Reminders reset to disabled");
    };

    const handleSaveReminders = async () => {
        if (!selectedEmailForReminder) return;

        try {
            // Check if any reminder is enabled to decide status
            const isAnyReminderEnabled = reminders.some(r => r.enabled);
            // ⭐ FIXED: Set to "active" instead of "scheduled" so cron can find it
            const status = isAnyReminderEnabled ? "active" : "draft";

            const res = await fetch(`/api/email-campaigns/${selectedEmailForReminder}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reminders,
                    status: status
                })
            });

            if (!res.ok) throw new Error("Update failed");

            setIsReminderDialogOpen(false);
            toast.success(`Reminders saved! Campaign is now ${status}.`);
            fetchEmails();
        } catch (error) {
            toast.error("Failed to save reminders");
        }
    };

    const handleSendTestMail = async () => {
        if (!selectedCampaignForTest?._id || !testEmail) {
            toast.error("Please provide a test email address");
            return;
        }

        setIsSendingTest(true);
        try {
            const res = await fetch(`/api/email-campaigns/${selectedCampaignForTest._id}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testEmail,
                    testData
                })
            });

            const json = await res.json();
            if (json.success) {
                toast.success("Test email sent!");
                setSelectedCampaignForTest(null);
            } else {
                toast.error(json.error || "Failed to send test email");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleConfirmTemplate = () => {
        if (!selectedTemplateId) {
            toast.error("Please select a template first");
            return;
        }

        const template = templatesList.find(t => t.id === selectedTemplateId);
        const subject = template?.defaultSubject || "";

        console.log('[EmailBuilder] Selected template ID:', selectedTemplateId);
        console.log('[EmailBuilder] Template:', template);

        // Pass template parameter for ALL templates (including default)
        const url = `/dashboard/add-email-builder?template=${selectedTemplateId}&subject=${encodeURIComponent(subject)}`;
        console.log('[EmailBuilder] Navigating to:', url);
        
        router.push(url);
        setIsTemplateDialogOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Email Builder</h1>
                    <p className="text-muted-foreground">Manage and design your email campaigns and templates.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {/* <Button variant="outline" onClick={() => router.push("/dashboard/add-email-builder")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Blank Email
                    </Button> */}
                {permissions.canCreate && (
                    <Button onClick={() => setIsTemplateDialogOpen(true)} className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white">
                        <Mail className="mr-2 h-4 w-4" />
                        Add Email
                    </Button>
                )}
                </div>
            </div>

            {/* Set Reminder Sheet (Right Side) */}
            <Sheet open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                <SheetContent side="right" className="p-0 overflow-hidden border-l border-border shadow-xl w-full sm:max-w-lg flex flex-col bg-background dark:bg-zinc-900">
                    <SheetHeader className="px-4 sm:px-8 py-6 border-b border-border flex flex-row items-center justify-between bg-background dark:bg-zinc-900">
                        <SheetTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            Set Reminders
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-8">
                        {reminders.map((reminder) => (
                            <div key={reminder.id} className="space-y-3">
                                <h4 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                                    Send {reminder.label} Reminder Before
                                </h4>

                                <div className={`flex flex-col sm:flex-row sm:items-center gap-4 ${!reminder.enabled ? 'opacity-50' : ''}`}>
                                    <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                                        <Select
                                            disabled={!reminder.enabled}
                                            value={reminder.unit}
                                            onValueChange={(val) => handleUpdateReminder(reminder.id, "unit", val)}
                                        >
                                            <SelectTrigger className="h-11 bg-muted border-border text-foreground rounded-md">
                                                <SelectValue placeholder="Select Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Minutes">Minutes</SelectItem>
                                                <SelectItem value="Hours">Hours</SelectItem>
                                                <SelectItem value="Days">Days</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            disabled={!reminder.enabled}
                                            value={reminder.value}
                                            onValueChange={(val) => handleUpdateReminder(reminder.id, "value", val)}
                                        >
                                            <SelectTrigger className="h-11 bg-muted border-border text-foreground rounded-md">
                                                <SelectValue placeholder="Select Value" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 4, 6, 8, 10, 12, 14, 24, 48].map(v => (
                                                    <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 min-w-[100px]">
                                        <Switch
                                            checked={reminder.enabled}
                                            onCheckedChange={() => handleToggleReminder(reminder.id)}
                                            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-200"
                                        />
                                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-14">
                                            {reminder.enabled ? 'Enable' : 'Disable'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 pb-2">
                            <Button
                                variant="outline"
                                onClick={handleResetReminders}
                                className="w-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground h-10 rounded-md"
                            >
                                Reset All Reminders
                            </Button>
                        </div>
                    </div>

                    <SheetFooter className="px-4 sm:px-8 py-6 border-t border-border bg-background dark:bg-zinc-900">
                        <Button
                            onClick={handleSaveReminders}
                            className="w-full bg-zinc-900 hover:bg-black text-white h-12 font-bold rounded-md"
                        >
                            Save Reminder Configuration
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Template Selection Dialog */}
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none rounded-[20px] shadow-xl bg-background dark:bg-zinc-900">
                    <div className="bg-muted px-4 sm:px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Choose your templates</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 flex flex-col max-h-[80vh] space-y-1">
                        {templatesList.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => setSelectedTemplateId(tpl.id)}
                                className="flex items-center gap-4 group text-left py-2.5 transition-colors"
                            >
                                <div className="w-5 h-5 rounded-full border border-zinc-400 shrink-0 flex items-center justify-center transition-colors">
                                    {selectedTemplateId === tpl.id && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                                    )}
                                </div>
                                <span className="text-[16px] text-foreground font-normal leading-tight">
                                    {tpl.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="px-4 sm:px-6 py-4 flex items-center justify-end gap-3 border-t">
                        <Button
                            variant="ghost"
                            onClick={() => setIsTemplateDialogOpen(false)}
                            className="bg-[#6c757d] hover:bg-[#5a6268] text-white px-6 rounded-md h-10 font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmTemplate}
                            className="bg-[#dc3545] hover:bg-[#c82333] text-white px-6 rounded-md h-10 font-medium"
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rest of the list page */}
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm ">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>Templates & Campaigns</CardTitle>
                            <CardDescription>A list of all your created emails and their current status.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9 w-full"
                                    placeholder="Search emails..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Sent</TableHead>
                                <TableHead className="w-[70px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingEmails ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Loading campaigns...
                                    </TableCell>
                                </TableRow>
                            ) : emails.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No campaigns found. Create your first email!
                                    </TableCell>
                                </TableRow>
                            ) : emails.filter(email =>
                                email.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                email.subject.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((email) => (
                                <TableRow key={email._id} className="group transition-colors hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{email.name}</span>
                                            <span className="text-xs text-muted-foreground font-normal">{email.subject}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                email.status === "sent" ? "secondary" :
                                                    (email.status === "active" || email.status === "scheduled") ? "default" :
                                                        "outline"
                                            }
                                            className="capitalize"
                                        >
                                            {email.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(email.createdAt).toLocaleDateString()}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1 justify-end">
                                            {permissions.canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                                                    onClick={() => router.push(`/dashboard/email-builder/${email._id}/edit`)}
                                                    title="Edit Design"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {permissions.canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                                                    onClick={() => {
                                                        setSelectedEmailForReminder(email._id);
                                                        if (email.reminders && email.reminders.length > 0) {
                                                            setReminders(email.reminders.map((r: any, idx: number) => ({
                                                                ...r,
                                                                id: idx + 1
                                                            })));
                                                        }
                                                        setIsReminderDialogOpen(true);
                                                    }}
                                                    title="Set Reminder"
                                                >
                                                    <Bell className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {permissions.canCreate && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                        setSelectedCampaignForTest(email);
                                                    }}
                                                    title="Send Test Mail"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {permissions.canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={async () => {
                                                        if (confirm("Are you sure you want to delete this campaign?")) {
                                                            await fetch(`/api/email-campaigns/${email._id}`, { method: 'DELETE' });
                                                            toast.success("Deleted successfully");
                                                            fetchEmails();
                                                        }
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedCampaignForTest} onOpenChange={(open) => !open && setSelectedCampaignForTest(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Send Test Email</DialogTitle>
                        <CardDescription>
                            Testing campaign: <span className="font-semibold text-zinc-900">{selectedCampaignForTest?.name}</span>
                            <br />
                            Subject: <span className="italic">"{selectedCampaignForTest?.subject}"</span>
                        </CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Recipient Email</label>
                            <Input
                                placeholder="test@example.com"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input
                                    value={testData.firstname}
                                    onChange={(e) => setTestData({ ...testData, firstname: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input
                                    value={testData.lastname}
                                    onChange={(e) => setTestData({ ...testData, lastname: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Service Name</label>
                            <Input
                                value={testData.service_name}
                                onChange={(e) => setTestData({ ...testData, service_name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Units (Booking Count)</label>
                                <Input
                                    value={testData.units}
                                    onChange={(e) => setTestData({ ...testData, units: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Price</label>
                                <Input
                                    value={testData.price}
                                    onChange={(e) => setTestData({ ...testData, price: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedCampaignForTest(null)}>Cancel</Button>
                        <Button onClick={handleSendTestMail} disabled={isSendingTest}>
                            {isSendingTest ? "Sending..." : "Send Test"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
