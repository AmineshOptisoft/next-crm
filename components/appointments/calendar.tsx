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
import { useRef, useState, useEffect, useMemo } from "react";
import { CalendarEvent } from "@/utils/calendar-data";
import { Card } from "@/components/ui/card";
import { EventEditForm } from "./event-edit-form";
import { AppointmentDetailsSheet, type AppointmentDetails } from "./appointment-details-sheet";
import { AddBookingForm } from "./add-booking-form";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());


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

  const [currentView, setCurrentView] = useState<string>("resourceTimelineDay");
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  // ── Permission check ── shared SWR cache with layout.tsx (zero extra network cost)
  const { data: meData } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const userRole: string = meData?.user?.role ?? '';
  const userPermissions: any[] = meData?.user?.permissions ?? [];
  const isAdminRole = userRole === 'super_admin' || userRole === 'company_admin';

  const hasAppointmentPermission = (action: 'canCreate' | 'canEdit' | 'canDelete') => {
    if (isAdminRole) return true;
    const perm = userPermissions.find((p: any) => p.module === 'appointments');
    return perm?.[action] === true;
  };

  // ── Pre-warm technician list cache ─────────────────────────────────────────
  // This SWR runs as soon as the calendar mounts, so that by the time the user
  // clicks a slot the AddBookingForm finds its data already cached (0 wait).
  useSWR('/api/appointments/resources', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  // Calendar events with date-range key for the timeline view
  const { data, isLoading } = useSWR(
    visibleRange ? `/api/appointments/resources?start=${visibleRange.start.toISOString()}&end=${visibleRange.end.toISOString()}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const resources = data?.resources || [];
  const events = data?.events || [];

  // Filter events per view with useMemo to prevent unnecessary React re-renders 
  // and FullCalendar forced updates every cycle
  const filteredEvents = useMemo(() => {
    return events.filter((event: any) => {
      const type = (event as any).type;
      if (type === "booking") return true;
      if (type === "unavailability") return true;
      if (type === "unavailability_timed") {
        return currentView === "resourceTimelineDay";
      }
      return true;
    });
  }, [events, currentView]);

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps as Record<string, any>;

    if (props?.type === "booking") {
      // ── Permission guard for viewing/editing bookings ─────────────────────
      if (!hasAppointmentPermission('canEdit')) {
        toast.error("You don't have permission to edit bookings.");
        return;
      }
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
    // ── Permission guard ──────────────────────────────────────────────────────
    if (!hasAppointmentPermission('canCreate')) {
      toast.error("You don't have permission to create bookings.");
      return;
    }

    // Check if the selected slot overlaps with any unavailability event
    const isUnavailable = events.some((event: any) => {
      if (event.resourceId !== info.resource?.id) return false;
      if (event.type !== "unavailability" && event.type !== "unavailability_timed") return false;
      if (event.type === "unavailability_timed" && currentView !== "resourceTimelineDay") return false;
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return info.start < eventEnd && info.end > eventStart;
    });

    if (isUnavailable) {
      toast.error("Technician is unavailable at this time.");
      return;
    }

    setSelectedStart(info.start);
    setSelectedEnd(info.end);
    setSelectedTechnicianId(info.resource?.id);
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
        onUpdate={() => {
           // Provide basic refetch compatibility where fetchCalendarData used to be.
           import('swr').then(swr => swr.mutate(
             visibleRange ? `/api/appointments/resources?start=${visibleRange.start.toISOString()}&end=${visibleRange.end.toISOString()}` : null
           ));
        }}
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
