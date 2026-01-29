"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
    date?: Date
    setDate: (date: Date) => void
    disabled?: boolean
    className?: string
}

export function DateTimePicker({ date, setDate, disabled, className }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
    const [timeValue, setTimeValue] = React.useState<string>(date ? format(date, "HH:mm") : "00:00")

    React.useEffect(() => {
        if (date) {
            setSelectedDate(date)
            setTimeValue(format(date, "HH:mm"))
        }
    }, [date])

    const handleDateSelect = (d: Date | undefined) => {
        if (d) {
            const newDate = new Date(d)
            const [hours, minutes] = timeValue.split(":").map(Number)
            newDate.setHours(hours)
            newDate.setMinutes(minutes)
            setSelectedDate(newDate)
            setDate(newDate)
        }
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = e.target.value
        setTimeValue(time)
        if (selectedDate) {
            const [hours, minutes] = time.split(":").map(Number)
            const newDate = new Date(selectedDate)
            newDate.setHours(hours)
            newDate.setMinutes(minutes)
            setDate(newDate)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP HH:mm") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <div className="p-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 opacity-50" />
                        <Label className="text-xs">Time</Label>
                        <Input
                            type="time"
                            value={timeValue}
                            onChange={handleTimeChange}
                            className="h-8 w-full"
                        />
                    </div>
                </div>
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
