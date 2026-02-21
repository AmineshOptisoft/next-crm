"use client";

import { useEvents } from "@/context/events-context";
import "@/app/calendar.css";
import {
  DateSelectArg,
  EventChangeArg,
  EventClickArg,
  DatesSetArg,
} from "@fullcalendar/core/index.js";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { useRef, useState, useEffect } from "react";
import { CalendarEvent } from "@/utils/calendar-data";
import { Card } from "@/components/ui/card";
import { EventEditForm } from "./event-edit-form";
import { AppointmentDetailsSheet, type AppointmentDetails } from "./appointment-details-sheet";
import { AddBookingForm } from "./add-booking-form";
import { toast } from "sonner";


export default function Calendar() {
  const {
    eventAddOpen,
    setEventAddOpen,
    appointmentDetailsOpen,
    setAppointmentDetailsOpen
  } = useEvents();

  const calendarRef = useRef<FullCalendar | null>(null);
  const [selectedStart, setSelectedStart] = useState(new Date());
  const [selectedEnd, setSelectedEnd] = useState(new Date());
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | undefined>();
  const [selectedOldEvent, setSelectedOldEvent] = useState<CalendarEvent | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetails | undefined>();
  const [isDrag, setIsDrag] = useState(false);

  // State for resources and events from mock API
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentView, setCurrentView] = useState<string>("resourceTimelineDay");
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  // Fetch data from real API for the given date range
  const fetchCalendarData = async (start?: Date, end?: Date) => {
    try {
      let url = '/api/appointments/resources';
      if (start && end) {
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
        });
        url = `${url}?${params.toString()}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setResources(data.resources);
      setEvents(data.events);
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
    }
  };

  // Re-fetch whenever the visible date range changes
  useEffect(() => {
    if (visibleRange) {
      fetchCalendarData(visibleRange.start, visibleRange.end);
    }
  }, [visibleRange?.start?.toISOString(), visibleRange?.end?.toISOString()]);

  // Filter events per view:
  // - bookings always visible
  // - full‑day unavailability visible in all views
  // - time‑based unavailability only in Day view
  const filteredEvents = events.filter((event: any) => {
    const type = (event as any).type;
    if (type === "booking") return true;
    if (type === "unavailability") return true;
    if (type === "unavailability_timed") {
      return currentView === "resourceTimelineDay";
    }
    return true;
  });

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps as Record<string, any>;

    if (props?.type === "booking") {
      const appointment: AppointmentDetails = {
        id: info.event.id,
        bookingId: props.bookingId,
        title: info.event.title,
        start: info.event.start!,
        end: info.event.end!,
        status: props.status,
        bookingStatus: props.bookingStatus,

        service: props.service,
        units: props.units,
        addons: props.addons,
        notes: props.notes,
        preferences: props.preferences,
        billingNotes: props.billingNotes,
        billedAmount: props.billedAmount,
        billedHours: props.billedHours,
        bookingPrice: props.bookingPrice,
        bookingDiscountPrice: props.bookingDiscountPrice,
        bookingDiscount: props.bookingDiscount,
        estimatedBilledAmount: props.estimatedBilledAmount,
        estimatedBilledHours: props.estimatedBilledHours,
        scheduledDuration: props.scheduledDuration,
        teamCleaningTime: props.teamCleaningTime,
        technicianTime: props.technicianTime,
        timesheetNotes: props.timesheetNotes,
        gpsArrivalTime: props.gpsArrivalTime,
        gpsDepartureTime: props.gpsDepartureTime,

        customerName: props.customerName,
        customerEmail: props.customerEmail,
        customerPhone: props.customerPhone,
        customerAddress: props.customerAddress,
        familyInfo: props.familyInfo,
        parkingAccess: props.parkingAccess,
        clientNotesFromTech: props.clientNotesFromTech,
        specialInstructionsFromClient: props.specialInstructionsFromClient,
        specialInstructionsFromAdmin: props.specialInstructionsFromAdmin,
        specialRequestFromClient: props.specialRequestFromClient,

        assignedStaff: props.assignedStaff,
        preferredTechnician: props.preferredTechnician,

        // Co-technicians on shared bookings
        coTechnicians: props.coTechnicians,
      };

      setSelectedAppointment(appointment);
      setAppointmentDetailsOpen(true);
      return;
    }

    const event: CalendarEvent = {
      id: info.event.id,
      title: info.event.title,
      description: String(props?.description ?? ""),
      backgroundColor: info.event.backgroundColor,
      start: info.event.start!,
      end: info.event.end!,
    };

    setIsDrag(false);
    setSelectedOldEvent(event);
    setSelectedEvent(event);
  };

  const handleEventChange = (info: EventChangeArg) => {
    // Logic for updating event (would need API call)
  };


  const handleDateSelect = (info: DateSelectArg) => {
    // Check if the selected slot overlaps with any unavailability event
    const isUnavailable = events.some((event: any) => {
      // Check if event belongs to the selected resource
      if (event.resourceId !== info.resource?.id) return false;

      // Check if the event is an unavailability type
      if (event.type !== "unavailability" && event.type !== "unavailability_timed") return false;
      
      // In Week/Month views, ignore timed unavailability (blockers) because the user selects a whole day
      // and might want to book a specific time slot that IS available.
      if (event.type === "unavailability_timed" && currentView !== "resourceTimelineDay") return false;

      // Check for time overlap
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      return info.start < eventEnd && info.end > eventStart;
    });

    if (isUnavailable) {
      toast.error("Technician is unavailable at this time.");
      return;
    }

    setSelectedStart(info.start);
    setSelectedEnd(info.end);
    setSelectedTechnicianId(info.resource?.id); // Capture technician ID from resource
    setEventAddOpen(true);
  };

  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

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
          initialView="resourceTimelineDay"
          headerToolbar={isMobile ? {
            left: 'prev,today,next',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
          } : {
            left: 'prev,today,next',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
          }}
          resourceAreaWidth={isMobile ? "45%" : "15%"}
          resourceAreaHeaderContent="Technicians"
          resources={resources}
          events={filteredEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          nowIndicator={true}
          height="85vh" // Adjust height as needed
          slotMinWidth={70}
          resourceGroupField="group"
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          datesSet={(arg: DatesSetArg) => {
            setCurrentView(arg.view.type);
            setVisibleRange({ start: arg.start, end: arg.end });
          }}
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
                <div className="font-semibold  truncate">{arg.event.title}</div>
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

      {/* Appointment Details Sheet */}
      <AppointmentDetailsSheet
        appointment={selectedAppointment}
        open={appointmentDetailsOpen}
        onOpenChange={setAppointmentDetailsOpen}
        onUpdate={fetchCalendarData}
      />

      {/* New Booking Form */}
      <AddBookingForm
        open={eventAddOpen}
        onOpenChange={setEventAddOpen}
        initialData={{
          start: selectedStart,
          end: selectedEnd,
          technicianId: selectedTechnicianId
        }}
      />
      <style>
        {`
          .fc-datagrid-cell-main{
            font-weight: 500 !important;
            }
            
            .fc-timeline-slot-cushion{
              font-weight: 300 !important;
              
            }
              .fc .fc-bg-event{
                opacity: 1 !important;
              }
        `}
      </style>
    </div>
  );
}
