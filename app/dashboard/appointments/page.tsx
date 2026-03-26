"use client";

import { useState } from "react";
import Calendar from "@/components/appointments/calendar";
import BookingsPage from "@/app/dashboard/bookings/page";
import { EventsProvider } from "@/context/events-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export default function AppointmentsPage() {
  const [sending, setSending] = useState(false);
  const [bookingsSheetOpen, setBookingsSheetOpen] = useState(false);

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
            className="bg-primary hover:bg-primary/90 text-secondary"
              size="sm"
              // variant="outline"
              onClick={() => setBookingsSheetOpen(true)}
            >
              My Bookings
            </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleSendEmails}
            disabled={sending}
            >
            {sending ? "Sending emails..." : "Send Today's Emails"}
          </Button>
            </div>
        </div>
        <div className="flex-1">
          <Calendar />
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
      </div>
    </EventsProvider>
  );
}
