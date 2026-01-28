"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const ALL_TIME_SLOTS = [
  "12:00 AM", "01:00 AM", "02:00 AM", "03:00 AM", "04:00 AM", "05:00 AM",
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM"
];

interface DaySchedule {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

interface UserAvailabilityProps {
  availability?: DaySchedule[];
  onChange?: (schedule: DaySchedule[]) => void;
  onSave?: () => void;
  loading?: boolean;
}

export function UserAvailability({ availability, onChange, onSave, loading }: UserAvailabilityProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    availability && availability.length > 0 ? availability : DAYS.map(day => ({
      day,
      isOpen: day !== "Tuesday" && day !== "Sunday",
      startTime: "09:00 AM",
      endTime: "06:00 PM"
    }))
  );
  const [masterAvailability, setMasterAvailability] = useState<DaySchedule[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  useEffect(() => {
    fetchMasterAvailability();
  }, []);

  const fetchMasterAvailability = async () => {
    try {
      const response = await fetch("/api/company/availability");
      if (response.ok) {
        const data = await response.json();
        setMasterAvailability(data);
      }
    } catch (error) {
      console.error("Error fetching master availability:", error);
    } finally {
      setLoadingMaster(false);
    }
  };

  const getMasterScheduleForDay = (day: string) => {
    return masterAvailability.find(m => m.day === day);
  };

  const isDayAllowed = (day: string) => {
    const master = getMasterScheduleForDay(day);
    return master ? master.isOpen : true;
  };

  const getFilteredTimeSlots = (day: string) => {
    const master = getMasterScheduleForDay(day);
    if (!master || !master.isOpen) return ALL_TIME_SLOTS;

    // Convert time to minutes for comparison
    const timeToMinutes = (time: string) => {
      const [timePart, period] = time.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const masterStart = timeToMinutes(master.startTime);
    const masterEnd = timeToMinutes(master.endTime);

    return ALL_TIME_SLOTS.filter(time => {
      const timeMinutes = timeToMinutes(time);
      return timeMinutes >= masterStart && timeMinutes <= masterEnd;
    });
  };

  const updateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
    const newSchedule = [...schedule];
    const day = newSchedule[index].day;

    // Prevent enabling days that are closed in master
    if (field === "isOpen" && value === true && !isDayAllowed(day)) {
      toast.error(`${day} is not available in the company's master schedule.`);
      return;
    }

    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);

    // Auto-update parent state
    if (onChange) {
      onChange(newSchedule);
    }
  };

  if (loadingMaster) {
    return <div className="text-center text-muted-foreground">Loading availability...</div>;
  }

  return (
    <div className="space-y-6">
      {masterAvailability.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your availability is restricted by the company's master schedule. You can only work on days and times that are open company-wide.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {schedule.map((slot, index) => {
          const dayAllowed = isDayAllowed(slot.day);
          const filteredTimeSlots = getFilteredTimeSlots(slot.day);

          return (
            <div key={slot.day} className="flex items-center justify-between border rounded-md p-4 bg-background">
              <div className="w-32 font-medium">{slot.day}</div>

              <Switch
                checked={slot.isOpen}
                onCheckedChange={(checked) => updateSchedule(index, "isOpen", checked)}
                disabled={!dayAllowed}
              />

              <div className="flex items-center gap-2">
                <Select
                  value={slot.startTime}
                  onValueChange={(val) => updateSchedule(index, "startTime", val)}
                  disabled={!slot.isOpen || !dayAllowed}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTimeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">to</span>
                <Select
                  value={slot.endTime}
                  onValueChange={(val) => updateSchedule(index, "endTime", val)}
                  disabled={!slot.isOpen || !dayAllowed}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTimeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={onSave} type="button" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Availability
        </Button>
      </div>
    </div>
  );
}

