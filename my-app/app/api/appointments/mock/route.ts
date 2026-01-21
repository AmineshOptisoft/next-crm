import { NextResponse } from "next/server";

export async function GET() {
    const technicians = [
        { id: "t1", title: "Chad Miller", group: "Window" },
        { id: "t2", title: "Praveen", group: "Window" },
        { id: "t3", title: "QA ANNA", group: "Window" },
        { id: "t4", title: "Satish Patidar", group: "ADMIN" },
        { id: "t5", title: "Maritza Mejia", group: "ADMIN" },
        { id: "t6", title: "Unassigned Jobs", group: "ADMIN" },
        { id: "t7", title: "Ricky Brown", group: "ADMIN" },
        { id: "t8", title: "Faith Velasco", group: "ADMIN" },
        { id: "t9", title: "Nataly Rodriguez", group: "La Mesa" },
        { id: "t10", title: "Ana Hernandez", group: "La Mesa" },
    ];

    // Helper to generate a date relative to today
    const getRelativeDate = (daysOffset: number, hours: number) => {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        date.setHours(hours, 0, 0, 0);
        return date.toISOString();
    }

    const events = [
        // Not Available Blocks (Red)
        { id: "e1", resourceId: "t1", title: "Not Available33", start: getRelativeDate(0, 8), end: getRelativeDate(0, 18), backgroundColor: "#dc2626", borderColor: "#dc2626" },
        { id: "e2", resourceId: "t2", title: "Not Available11", start: getRelativeDate(0, 6), end: getRelativeDate(0, 9), backgroundColor: "#dc2626", borderColor: "#dc2626" },
        { id: "e3", resourceId: "t2", title: "Not Available22", start: getRelativeDate(0, 19), end: getRelativeDate(0, 22), backgroundColor: "#dc2626", borderColor: "#dc2626" },
        { id: "e4", resourceId: "t3", title: "Not Available22", start: getRelativeDate(0, 12), end: getRelativeDate(0, 20), backgroundColor: "#dc2626", borderColor: "#dc2626" },

        // Jobs (Blue/Yellow)
        { id: "j1", resourceId: "t6", title: "[PT:] - Aisling Williams", start: getRelativeDate(0, 10), end: getRelativeDate(0, 13), backgroundColor: "#facc15", borderColor: "#facc15", textColor: "black" },
        { id: "j2", resourceId: "t6", title: "[PT:] - gfnl", start: getRelativeDate(0, 12), end: getRelativeDate(0, 14), backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },

        // More Examples
        { id: "e5", resourceId: "t4", title: "Not Available11", start: getRelativeDate(0, 6), end: getRelativeDate(0, 10), backgroundColor: "#dc2626", borderColor: "#dc2626" },
        { id: "e6", resourceId: "t4", title: "Not Available22", start: getRelativeDate(0, 16), end: getRelativeDate(0, 22), backgroundColor: "#dc2626", borderColor: "#dc2626" },

        // Next Day events
        { id: "e7", resourceId: "t1", title: "Not Available", start: getRelativeDate(1, 9), end: getRelativeDate(1, 17), backgroundColor: "#dc2626", borderColor: "#dc2626" },
    ];

    // Resources need to be formatted for FullCalendar
    // We can use groupings if we want, but for simple resource-timeline:
    // resources: [ { id, title, eventColor?, children?: [] } ]

    // Let's grouping by group field manually or use FullCalendar's grouping features if paid, 
    // but resource-timeline supports nested resources.

    const resources = [
        { id: "g1", title: "Window", children: technicians.filter(t => t.group === "Window").map(t => ({ id: t.id, title: t.title })) },
        { id: "g2", title: "ADMIN", children: technicians.filter(t => t.group === "ADMIN").map(t => ({ id: t.id, title: t.title })) },
        { id: "g3", title: "La Mesa", children: technicians.filter(t => t.group === "La Mesa").map(t => ({ id: t.id, title: t.title })) },
    ];

    return NextResponse.json({ resources, events });
}
