"use client";

import Calendar from "@/components/appointments/calendar";
import { EventsProvider } from "@/context/events-context";

export default function AppointmentsPage() {
  return (
    <EventsProvider>
      <div className="flex flex-col h-full bg-background p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        </div>
        <div className="flex-1">
          <Calendar />
        </div>
      </div>
    </EventsProvider>
  );
}
