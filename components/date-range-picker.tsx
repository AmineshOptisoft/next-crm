"use client";

import React, { useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import { format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { Button } from "@/components/ui/button";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  placeholder?: string;
  showMonthAndYearPickers?: boolean;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  placeholder = "Select date range",
  showMonthAndYearPickers = false,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectRange = (ranges: RangeKeyDict) => {
    const start = ranges.selection.startDate;
    const end = ranges.selection.endDate;

    if (start && end) {
      const formattedStart = format(start, "yyyy-MM-dd");
      const formattedEnd = format(end, "yyyy-MM-dd");
      onRangeChange(formattedStart, formattedEnd);
    }
  };

  const handlePreset = (type: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (type) {
      case "today":
        start = today;
        break;
      case "yesterday":
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case "thisWeek":
        start = new Date(today);
        start.setDate(start.getDate() - today.getDay());
        break;
      case "lastWeek":
        start = new Date(today);
        start.setDate(start.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    const formattedStart = format(start, "yyyy-MM-dd");
    const formattedEnd = format(end, "yyyy-MM-dd");
    onRangeChange(formattedStart, formattedEnd);
  };

  const displayStart = startDate ? format(new Date(startDate), "MMM d, yyyy") : "Start";
  const displayEnd = endDate ? format(new Date(endDate), "MMM d, yyyy") : "End";

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span>
          {startDate && endDate
            ? `${displayStart} - ${displayEnd}`
            : placeholder}
        </span>
      </Button>

      {/* {isOpen && ( */}
      <div className=" z-50 p-4">
        <div className="flex gap-4">
          {/* Left Sidebar with Presets */}
          <div className="w-35 border-r pr-4">
            <div className="space-y-2 text-sm">
              <button
                onClick={() => {
                  handlePreset("today");
                  setIsOpen(false);
                }}
                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              >
                Today
              </button>
              <button
                onClick={() => {
                  handlePreset("yesterday");
                  setIsOpen(false);
                }}
                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              >
                Yesterday
              </button>
              <button
                onClick={() => {
                  handlePreset("thisWeek");
                  setIsOpen(false);
                }}
                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              >
                This Week
              </button>
              <button
                onClick={() => {
                  handlePreset("lastWeek");
                  setIsOpen(false);
                }}
                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              >
                Last Week
              </button>
              <button
                onClick={() => {
                  handlePreset("thisMonth");
                  setIsOpen(false);
                }}
                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  handlePreset("lastMonth");
                  setIsOpen(false);
                }}
                className="block w-full text-left px-2 py-1 hover:bg-blue-100 text-blue-600 rounded"
              >
                Last Month
              </button>

              <div className="border-t my-2"></div>

              <div className="text-xs text-gray-600">
                <label className="flex items-center gap-1 py-1">
                  <input type="number" placeholder="-" className="w-8 h-6 text-xs" />
                  days up to today
                </label>
                <label className="flex items-center gap-1 py-1">
                  <input type="number" placeholder="-" className="w-8 h-6 text-xs" />
                  days starting today
                </label>
              </div>
            </div>
          </div>

          {/* Right Calendar */}
          <div>
            <DateRange
              className={className}
              editableDateInputs={true}
              moveRangeOnFirstSelection={false}
              rangeColors={["#6c748157"]}
              showMonthAndYearPickers={showMonthAndYearPickers}
              showDateDisplay={false}
              ranges={[
                {
                  startDate: startDate
                    ? new Date(startDate)
                    : new Date(),
                  endDate: endDate ? new Date(endDate) : new Date(),
                  key: "selection",
                },
              ]}
              onChange={handleSelectRange}
              months={1}
              direction="horizontal"
            />
            {/* <div className="flex gap-2 mt-4 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
              </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
