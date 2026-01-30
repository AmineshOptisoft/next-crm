import { NextResponse } from "next/server";
import { initializeCronJobs } from "@/lib/cronInit";

export async function GET() {
    try {
        initializeCronJobs();
        return NextResponse.json({
            success: true,
            message: "Cron jobs initialized"
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
