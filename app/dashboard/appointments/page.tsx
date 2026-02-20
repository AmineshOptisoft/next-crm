"use client";

import { useState } from "react";
import Calendar from "@/components/appointments/calendar";
import { EventsProvider } from "@/context/events-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AppointmentsPage() {
  const [sending, setSending] = useState(false);

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
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <Button
            size="sm"
            variant="default"
            onClick={handleSendEmails}
            disabled={sending}
          >
            {sending ? "Sending emails..." : "Send Today's Emails"}
          </Button>
        </div>
        <div className="flex-1">
          <Calendar />
        </div>
      </div>
    </EventsProvider>
  );
}
