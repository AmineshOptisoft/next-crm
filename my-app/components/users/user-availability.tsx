"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
];

interface DaySchedule {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export function UserAvailability() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map(day => ({
      day,
      isOpen: day !== "Tuesday" && day !== "Sunday", // Matching screenshot defaults (roughly)
      startTime: "09:00 AM",
      endTime: "06:00 PM"
    }))
  );

  const updateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
          <h3 className="font-medium text-lg">Schedule</h3>
      </div>

      <div className="border-b pb-2 mb-4 flex">
           <div className="flex-1 font-medium text-primary pl-4">Availability</div>
           <div className="w-1/3 font-medium text-right pr-12">Off Time</div>
      </div>

      <div className="space-y-4">
        {schedule.map((slot, index) => (
          <div key={slot.day} className="flex items-center justify-between border rounded-md p-4 bg-background">
            <div className="w-32 font-medium">{slot.day}</div>
            
            <Switch
              checked={slot.isOpen}
              onCheckedChange={(checked) => updateSchedule(index, "isOpen", checked)}
            />

            <div className="flex items-center gap-2">
                <Select
                    value={slot.startTime}
                    onValueChange={(val) => updateSchedule(index, "startTime", val)}
                    disabled={!slot.isOpen}
                >
                    <SelectTrigger className="w-[110px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">to</span>
                 <Select
                    value={slot.endTime}
                    onValueChange={(val) => updateSchedule(index, "endTime", val)}
                    disabled={!slot.isOpen}
                >
                    <SelectTrigger className="w-[110px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <Button>
          Save Availability
        </Button>
      </div>
    </div>
  );
}
