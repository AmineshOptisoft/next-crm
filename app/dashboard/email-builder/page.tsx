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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Mock data for existing emails
const mockEmails = [
    { id: "1", name: "Welcome Sequence - Step 1", subject: "Welcome to the family!", status: "sent", sentAt: "2024-01-20", opens: 450, clicks: 120 },
    { id: "2", name: "Booking Confirmed", subject: "Your booking is confirmed", status: "active", sentAt: "2024-01-25", opens: 890, clicks: 340 },
    { id: "3", name: "Service Feedback", subject: "How did we do?", status: "draft", sentAt: "-", opens: 0, clicks: 0 },
    { id: "4", name: "Monthly Newsletter - Feb", subject: "What's new this month", status: "scheduled", sentAt: "2024-02-01", opens: 0, clicks: 0 },
];

export default function EmailBuilderListPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
    const [selectedEmailForReminder, setSelectedEmailForReminder] = useState<string | null>(null);
    const [emails, setEmails] = useState<any[]>([]);
    const [loadingEmails, setLoadingEmails] = useState(true);

    // Test Mail States
    const [isTestMailDialogOpen, setIsTestMailDialogOpen] = useState(false);
    const [testEmailId, setTestEmailId] = useState<string | null>(null);
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

    const [reminders, setReminders] = useState([
        { id: 1, label: "First", unit: "Hours", value: "6", enabled: true },
        { id: 2, label: "Second", unit: "Minutes", value: "8", enabled: true },
        { id: 3, label: "Third", unit: "Days", value: "9", enabled: true },
        { id: 4, label: "Fourth", unit: "Minutes", value: "11", enabled: true },
        { id: 5, label: "Fifth", unit: "Hours", value: "14", enabled: true },
    ]);

    useEffect(() => {
        fetchEmails();
    }, []);

    const fetchEmails = async () => {
        setLoadingEmails(true);
        try {
            const res = await fetch('/api/email-campaigns');
            const json = await res.json();
            if (json.success) {
                setEmails(json.data);
            }
        } catch (error) {
            toast.error("Failed to load campaigns");
        } finally {
            setLoadingEmails(false);
        }
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
            const res = await fetch(`/api/email-campaigns/${selectedEmailForReminder}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reminders })
            });

            if (!res.ok) throw new Error("Update failed");

            setIsReminderDialogOpen(false);
            toast.success("Reminders saved successfully!");
            fetchEmails();
        } catch (error) {
            toast.error("Failed to save reminders");
        }
    };

    const handleSendTestMail = async () => {
        if (!testEmailId || !testEmail) {
            toast.error("Please provide a test email address");
            return;
        }

        setIsSendingTest(true);
        try {
            const res = await fetch(`/api/email-campaigns/${testEmailId}/test`, {
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
                setIsTestMailDialogOpen(false);
            } else {
                toast.error(json.error || "Failed to send test email");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSendingTest(false);
        }
    };

    const templatesList = [
        { id: "01_welcome_email", name: "Welcome Email", icon: "👋" },
        { id: "02_booking_confirmation", name: "Booking Confirmation", icon: "✅" },
        { id: "03_booking_reminder", name: "Booking Reminder", icon: "⏰" },
        { id: "04_service_thank_you", name: "Service Thank You", icon: "🙏" },
        { id: "05_follow_up_review", name: "Follow-up Review", icon: "⭐" },
        { id: "06_offer_discount", name: "Offer & Discount", icon: "📢" },
        { id: "07_reengagement_email", name: "Re-engagement", icon: "🔄" },
        { id: "08_cancellation_confirmation", name: "Cancellation Confirmation", icon: "❌" },
        { id: "09_daily_schedule_staff", name: "Daily Schedule (Staff)", icon: "📅" },
        { id: "10_shift_reminder_staff", name: "Shift Reminder (Staff)", icon: "🔔" },
        { id: "11_policy_update_staff", name: "Policy Update (Staff)", icon: "📋" },
        { id: "12_payslip_info", name: "Payslip Info", icon: "💰" },
        { id: "13_reset_password", name: "Reset Password", icon: "🔑" },
        { id: "14_invoice_email", name: "Invoice Email", icon: "📑" },
        { id: "15_account_confirmation", name: "Account Confirmation", icon: "👤" },
        { id: "16_subscription_renewal", name: "Subscription Renewal", icon: "🔄" },
    ];

    const handleSelectTemplate = (id: string) => {
        router.push(`/dashboard/add-email-builder?template=${id}.html`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Email Builder</h1>
                    <p className="text-muted-foreground">Manage and design your email campaigns and templates.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/dashboard/add-email-builder")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Blank Email
                    </Button>
                    <Button onClick={() => setIsTemplateDialogOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                        <Mail className="mr-2 h-4 w-4" />
                        Use Template
                    </Button>
                </div>
            </div>

            {/* Set Reminder Sheet (Right Side) */}
            <Sheet open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                <SheetContent side="right" className="p-0 overflow-hidden border-l shadow-xl w-full sm:max-w-lg flex flex-col bg-white">
                    <SheetHeader className="px-8 py-6 border-b flex flex-row items-center justify-between bg-white">
                        <SheetTitle className="text-xl font-bold text-zinc-800">
                            Set Reminders
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
                        {reminders.map((reminder) => (
                            <div key={reminder.id} className="space-y-3">
                                <h4 className="text-[15px] font-semibold text-zinc-800">
                                    Send {reminder.label} Reminder Before
                                </h4>

                                <div className={`flex items-center gap-4 ${!reminder.enabled ? 'opacity-50' : ''}`}>
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <Select
                                            disabled={!reminder.enabled}
                                            value={reminder.unit}
                                            onValueChange={(val) => handleUpdateReminder(reminder.id, "unit", val)}
                                        >
                                            <SelectTrigger className="h-11 bg-zinc-50 border-zinc-200 text-zinc-600 rounded-md">
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
                                            <SelectTrigger className="h-11 bg-zinc-50 border-zinc-200 text-zinc-600 rounded-md">
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
                                            className="data-[state=checked]:bg-zinc-800 data-[state=unchecked]:bg-zinc-200"
                                        />
                                        <span className="text-sm font-medium text-zinc-500 w-14">
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
                                className="w-full border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 h-10 rounded-md"
                            >
                                Reset All Reminders
                            </Button>
                        </div>
                    </div>

                    <SheetFooter className="px-8 py-6 border-t bg-white">
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
                <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="px-8 py-6 bg-zinc-50 dark:bg-zinc-900/50 border-b">
                        <DialogTitle className="text-2xl font-bold tracking-tight">Select a Predefined Template</DialogTitle>
                        <CardDescription>Choose one of our professional templates to get started quickly.</CardDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-zinc-950">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {templatesList.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    onClick={() => handleSelectTemplate(tpl.id)}
                                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-zinc-100 hover:border-zinc-900 hover:bg-zinc-50 transition-all group text-center space-y-3"
                                >
                                    <span className="text-4xl group-hover:scale-110 transition-transform">{tpl.icon}</span>
                                    <span className="text-sm font-semibold text-zinc-700 group-hover:text-black">{tpl.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rest of the list page */}
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Templates & Campaigns</CardTitle>
                            <CardDescription>A list of all your created emails and their current status.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Sent</TableHead>
                                <TableHead className="text-right">Opens/Clicks</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingEmails ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading campaigns...
                                    </TableCell>
                                </TableRow>
                            ) : emails.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
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
                                                    email.status === "active" ? "default" :
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
                                    <TableCell className="text-right text-sm">
                                        <div className="flex flex-col items-end">
                                            <span>0 opens</span>
                                            <span className="text-xs text-muted-foreground">0 clicks</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/email-builder/${email._id}/edit`)}>
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    Edit Design
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedEmailForReminder(email._id);
                                                    // Load existing reminders if any
                                                    if (email.reminders && email.reminders.length > 0) {
                                                        setReminders(email.reminders.map((r: any, idx: number) => ({
                                                            ...r,
                                                            id: idx + 1 // Ensure we have local IDs for UI mapping
                                                        })));
                                                    }
                                                    setIsReminderDialogOpen(true);
                                                }}>
                                                    <Bell className="mr-2 h-4 w-4" />
                                                    Set Reminder
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setTestEmailId(email._id);
                                                    setIsTestMailDialogOpen(true);
                                                }}>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Send Test Mail
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-500"
                                                    onClick={async () => {
                                                        if (confirm("Are you sure you want to delete this campaign?")) {
                                                            await fetch(`/api/email-campaigns/${email._id}`, { method: 'DELETE' });
                                                            toast.success("Deleted successfully");
                                                            fetchEmails();
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Test Mail Dialog */}
            <Dialog open={isTestMailDialogOpen} onOpenChange={setIsTestMailDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Send Test Email</DialogTitle>
                        <CardDescription>Enter the recipient and preview data for your test email.</CardDescription>
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
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
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
                        <Button variant="outline" onClick={() => setIsTestMailDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendTestMail} disabled={isSendingTest}>
                            {isSendingTest ? "Sending..." : "Send Test"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
