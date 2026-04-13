"use client";

import { useCallback, useMemo, useState } from "react";
import Calendar from "@/components/appointments/calendar";
import BookingsPage from "@/app/dashboard/bookings/page";
import { EventsProvider } from "@/context/events-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TechnicianDailyAnalytics,
  type TechnicianDailyAnalyticsRow,
  type TechnicianDailyAnalyticsSummary,
} from "@/components/dashboard/technician-daily-analytics";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import useSWR from "swr";

type ContactUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  createdAt?: string;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

export default function AppointmentsPage() {
  const [sending, setSending] = useState(false);
  const [bookingsSheetOpen, setBookingsSheetOpen] = useState(false);
  const [analyticsSheetOpen, setAnalyticsSheetOpen] = useState(false);
  const [selectedClientListType, setSelectedClientListType] = useState<"new" | "existing" | null>(
    null
  );
  const [analyticsData, setAnalyticsData] = useState<{
    dateLabel: string;
    rows: TechnicianDailyAnalyticsRow[];
    summary: TechnicianDailyAnalyticsSummary;
  }>({
    dateLabel: "-", 
    rows: [],
    summary: {
      totalAvailableLabel: "0h",
      totalWorkingLabel: "0h",
      totalVacantLabel: "0h",
    },
  });
  const { data: contactsData } = useSWR<ContactUser[]>("/api/contacts", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  const contacts = useMemo(
    () => (Array.isArray(contactsData) ? contactsData : []),
    [contactsData]
  );
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 7);
    return d;
  }, []);
  const newClients = useMemo(
    () =>
      contacts.filter((contact) => {
        if (!contact.createdAt) return false;
        const created = new Date(contact.createdAt);
        return !Number.isNaN(created.getTime()) && created >= sevenDaysAgo;
      }),
    [contacts, sevenDaysAgo]
  );
  const existingClients = useMemo(
    () =>
      contacts.filter((contact) => {
        if (!contact.createdAt) return false;
        const created = new Date(contact.createdAt);
        return !Number.isNaN(created.getTime()) && created < sevenDaysAgo;
      }),
    [contacts, sevenDaysAgo]
  );
  const selectedClients = selectedClientListType === "new" ? newClients : existingClients;
  const selectedClientsTitle =
    selectedClientListType === "new"
      ? "New Clients (Last 7 Days)"
      : selectedClientListType === "existing"
      ? "Existing Clients"
      : "";
  const handleAnalyticsChange = useCallback(
    (next: {
      dateLabel: string;
      rows: TechnicianDailyAnalyticsRow[];
      summary: TechnicianDailyAnalyticsSummary;
    }) => {
      setAnalyticsData((prev) => {
        const prevSignature = JSON.stringify(prev);
        const nextSignature = JSON.stringify(next);
        return prevSignature === nextSignature ? prev : next;
      });
    },
    []
  );

  const handleSendEmails = async () => {
    setSending(true);
    try {
      // Fire both API calls in parallel
      const [remindersRes, scheduleRes] = await Promise.all([
        fetch("/api/bookings/sendmails", { method: "POST" }),
        fetch("/api/bookings/daily-schedule", { method: "POST" }),
      ]);

      const [remindersJson, scheduleJson] = await Promise.all([
        remindersRes.json(),
        scheduleRes.json(),
      ]);

      const remindersOk = remindersRes.ok && !remindersJson.error;
      const scheduleOk = scheduleRes.ok && !scheduleJson.error;

      if (!remindersOk && !scheduleOk) {
        toast.error("Failed to send both reminder and schedule emails.");
        return;
      }

      if (!remindersOk) {
        toast.warning(
          `Schedule emails sent, but reminders failed: ${remindersJson.error || "Unknown error"}`
        );
        return;
      }

      if (!scheduleOk) {
        toast.warning(
          `Reminder emails sent, but schedule failed: ${scheduleJson.error || "Unknown error"}`
        );
        return;
      }

      toast.success(
        `Emails sent — ${scheduleJson.details?.sent ?? 0} staff schedule email(s) & ${remindersJson.uniqueEmailsTargeted ?? 0} client reminder(s).`
      );
    } catch (error) {
      toast.error("Failed to send emails.");
    } finally {
      setSending(false);
    }
  };

  return (
    <EventsProvider>
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setAnalyticsSheetOpen(true)}
              >
              Analytics
            </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-secondary"
              size="sm"
              // variant="outline"
              onClick={() => setBookingsSheetOpen(true)}
            >
              My Bookings
            </Button>
          {/* <Button
            size="lg"
            variant="outline"
            onClick={handleSendEmails}
            disabled={sending}
            >
            {sending ? "Sending emails..." : "Send Today's Emails"}
          </Button> */}
            </div>
        </div>
        <div className="flex-1">
          <Calendar onAnalyticsChange={handleAnalyticsChange} />
        </div>

        <Sheet open={bookingsSheetOpen} onOpenChange={setBookingsSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-5xl p-5">
            <SheetHeader>
              <SheetTitle>Bookings</SheetTitle>
            </SheetHeader>
            <div className="mt-4 h-[calc(100vh-120px)] overflow-y-auto">
              <BookingsPage />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={analyticsSheetOpen} onOpenChange={setAnalyticsSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-5xl p-5">
            <SheetHeader>
              <SheetTitle>Technician Analytics</SheetTitle>
              <SheetDescription>
                Based on current calendar range (day, week, or month). Substitute technicians are excluded.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 h-[calc(100vh-140px)] overflow-y-auto pr-1">
              <TechnicianDailyAnalytics
                dateLabel={analyticsData.dateLabel}
                summary={analyticsData.summary}
                rows={analyticsData.rows}
                emptyMessage="No technicians available in the selected range."
              />
              <div className="mt-6 space-y-3">
                <h3 className="text-base font-semibold">Users</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      setSelectedClientListType((prev) => (prev === "new" ? null : "new"));
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">New Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold">{newClients.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Added in the last 7 days. Click to view list.
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      setSelectedClientListType((prev) =>
                        prev === "existing" ? null : "existing"
                      );
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Existing Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold">{existingClients.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Added before last 7 days. Click to view list.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {selectedClientListType && (
                  <div className="rounded-md border">
                    <div className="border-b px-4 py-3">
                      <div className="font-medium">{selectedClientsTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedClientListType === "new"
                          ? "Contacts created within the last 7 days."
                          : "Contacts created earlier than the last 7 days."}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {selectedClients.length === 0 ? (
                        <div className="p-6 text-sm text-muted-foreground text-center">
                          No clients found.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {selectedClients.map((client) => {
                            const name =
                              `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
                              "Unnamed Client";
                            const created = client.createdAt
                              ? new Date(client.createdAt).toLocaleDateString()
                              : "-";
                            return (
                              <div
                                key={client._id}
                                className="p-4 flex items-start justify-between gap-4"
                              >
                                <div>
                                  <div className="font-medium">{name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {client.email || "-"}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                  {created}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </EventsProvider>
  );
}
