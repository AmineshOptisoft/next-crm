"use client";

import { useEvents } from "@/context/events-context";
import "@/app/calendar.css";
import {
  DateSelectArg,
  DayCellContentArg,
  DayHeaderContentArg,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { useRef, useState, useEffect } from "react";
import { CalendarEvent } from "@/utils/calendar-data";
import { Card } from "@/components/ui/card";
import { EventEditForm } from "./event-edit-form";
import { EventView } from "./event-view";
import { AddBookingForm } from "./add-booking-form";


export default function Calendar() {
  const { eventAddOpen, setEventAddOpen, setEventEditOpen, setEventViewOpen } = useEvents();

  const calendarRef = useRef<FullCalendar | null>(null);
  const [selectedStart, setSelectedStart] = useState(new Date());
  const [selectedEnd, setSelectedEnd] = useState(new Date());
  const [selectedOldEvent, setSelectedOldEvent] = useState<CalendarEvent | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [isDrag, setIsDrag] = useState(false);

  // State for resources and events from mock API
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);

  // Fetch mock data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/appointments/mock');
        const data = await res.json();
        setResources(data.resources);
        setEvents(data.events);
      } catch (error) {
        console.error("Failed to fetch calendar data:", error);
      }
    }
    fetchData();
  }, []);

  const handleEventClick = (info: EventClickArg) => {
    const event: CalendarEvent = {
      id: info.event.id,
      title: info.event.title,
      description: info.event.extendedProps.description,
      backgroundColor: info.event.backgroundColor,
      start: info.event.start!,
      end: info.event.end!,
    };

    setIsDrag(false);
    setSelectedOldEvent(event);
    setSelectedEvent(event);
    setEventViewOpen(true);
  };

  const handleEventChange = (info: EventChangeArg) => {
    // Logic for updating event (would need API call)
  };

  const handleDateSelect = (info: DateSelectArg) => {
    setSelectedStart(info.start);
    setSelectedEnd(info.end);
    setEventAddOpen(true);
  };

  return (
    <div className="space-y-5 h-full">
      <Card className="p-0 border-none shadow-none h-full bg-white dark:bg-zinc-950">
        <FullCalendar
          ref={calendarRef}
          schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
          timeZone="local"
          plugins={[
            resourceTimelinePlugin,
            interactionPlugin,
          ]}
          initialView="resourceTimelineWeek"
          headerToolbar={{
            left: 'prev,today,next',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
          }}
          resourceAreaWidth="15%"
          resourceAreaHeaderContent="Technicians"
          resources={resources}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          nowIndicator={true}
          height="85vh" // Adjust height as needed
          slotMinWidth={50}
          resourceGroupField="group"
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          views={{
            resourceTimelineDay: {
              buttonText: 'Day',
              slotDuration: '00:30:00'
            },
            resourceTimelineWeek: {
              buttonText: 'Week',
              duration: { days: 7 },
              slotDuration: { days: 1 },
              slotLabelFormat: { weekday: 'short', day: 'numeric', month: 'numeric' }
            },
            resourceTimelineMonth: {
              buttonText: 'Month'
            }
          }}
          eventContent={(arg) => {
            // Custom event content if needed, for now standard is fine or minimal customization
            return (
              <div className="flex flex-col overflow-hidden text-xs p-1 h-full justify-center">
                <div className="font-semibold truncate">{arg.event.title}</div>
              </div>
            )
          }}
        />
      </Card>

      {/* Existing Dialogs */}
      <EventEditForm
        oldEvent={selectedOldEvent}
        event={selectedEvent}
        isDrag={isDrag}
        displayButton={false}
      />
      <EventView event={selectedEvent} />

      {/* New Booking Form */}
      <AddBookingForm
        open={eventAddOpen}
        onOpenChange={setEventAddOpen}
        initialData={{ start: selectedStart, end: selectedEnd }}
      />
    </div>
  );
}
