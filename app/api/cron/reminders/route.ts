import { NextRequest, NextResponse } from "next/server";
import { startReminderCron, triggerReminderProcessing } from "@/lib/reminderCron";

// Track if cron is already started
let cronStarted = false;

export async function GET(req: NextRequest) {
    try {
        if (!cronStarted) {
            startReminderCron();
            cronStarted = true;
            return NextResponse.json({
                message: "Reminder cron job started successfully",
                status: "started"
            });
        }

        return NextResponse.json({
            message: "Reminder cron job is already running",
            status: "running"
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Manual trigger for testing
        await triggerReminderProcessing();
        return NextResponse.json({
            message: "Reminder processing triggered manually",
            status: "completed"
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
