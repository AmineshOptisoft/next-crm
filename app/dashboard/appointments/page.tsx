"use client";

import { useState } from "react";
import Calendar from "@/components/appointments/calendar";
import { EventsProvider } from "@/context/events-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AppointmentsPage() {
  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await fetch("/api/bookings/sendmails", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to send booking reminder emails.");
        return;
      }

      toast.success(json.message || "Booking reminder emails sent.");
    } catch (error) {
      toast.error("Failed to send booking reminder emails.");
    } finally {
      setSendingReminders(false);
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
            onClick={handleSendReminders}
            disabled={sendingReminders}
          >
            {sendingReminders ? "Sending reminders..." : "Send booking reminders"}
          </Button>
        </div>
        <div className="flex-1">
          <Calendar />
        </div>
      </div>
    </EventsProvider>
  );
}
