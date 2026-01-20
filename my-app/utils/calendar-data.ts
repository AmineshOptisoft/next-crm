import FullCalendar from "@fullcalendar/react";
import { RefObject } from "react";

export type calendarRef = RefObject<FullCalendar | null>;

// setting earliest / latest available time in minutes since Midnight
export const earliestTime = 540;
export const latestTime = 1320;

export const months = [
  {
    value: "1",
    label: "January",
  },
  {
    value: "2",
    label: "February",
  },
  {
    value: "3",
    label: "March",
  },
  {
    value: "4",
    label: "April",
  },
  {
    value: "5",
    label: "May",
  },
  {
    value: "6",
    label: "June",
  },
  {
    value: "7",
    label: "July",
  },
  {
    value: "8",
    label: "August",
  },
  {
    value: "9",
    label: "September",
  },
  {
    value: "10",
    label: "October",
  },
  {
    value: "11",
    label: "November",
  },
  {
    value: "12",
    label: "December",
  },
];

const getRandomDays = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const currentDate = new Date();

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  description: string;
}

export const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Client Meeting",
    start: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      10,
      0
    ),
    end: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      11,
      0
    ),
    backgroundColor: "#AEC6E4",
    description: "Meeting with potential client to discuss project requirements.",
  },
  {
    id: "2",
    title: "Team Standup",
    start: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      9,
      0
    ),
    end: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      9,
      30
    ),
    backgroundColor: "#B2E0B2",
    description: "Daily team standup meeting.",
  },
  {
    id: "3",
    title: "Product Demo",
    start: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1,
      14,
      0
    ),
    end: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1,
      15,
      0
    ),
    backgroundColor: "#FFD1DC",
    description: "Product demonstration for stakeholders.",
  },
  {
    id: "4",
    title: "Sales Call",
    start: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 2,
      11,
      0
    ),
    end: new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 2,
      12,
      0
    ),
    backgroundColor: "#FFDFBA",
    description: "Follow-up call with prospect.",
  },
];
