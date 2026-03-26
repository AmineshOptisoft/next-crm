import { NextRequest, NextResponse } from "next/server";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import { connectDB } from "@/lib/db";
import { Types } from "mongoose";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const deletedTimeOff = await TechnicianTimeOff.findByIdAndDelete(id);

        if (!deletedTimeOff) {
            return NextResponse.json({ error: "Time off not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Time off deleted successfully" });
    } catch (error) {
        console.error("Failed to delete time off:", error);
        return NextResponse.json({ error: "Failed to delete time off" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const body = await req.json();
        const { status, startDate, endDate, startTime, endTime, reason, notes } = body;
        const normalizedStatus = typeof status === "string" ? status.toUpperCase() : undefined;

        // Build update object
        const update: Record<string, any> = {};
        if (normalizedStatus) update.status = normalizedStatus;
        if (startDate) update.startDate = new Date(startDate);
        if (endDate) update.endDate = new Date(endDate);
        if (startTime) update.startTime = startTime;
        if (endTime) update.endTime = endTime;
        if (reason) update.reason = reason;
        if (notes !== undefined) update.notes = notes;

        const existingTimeOff = await TechnicianTimeOff.findById(id).select("status").lean();

        const updatedTimeOff = await TechnicianTimeOff.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).populate("technicianId", "firstName lastName email avatarUrl companyId");

        if (!updatedTimeOff) {
            return NextResponse.json({ error: "Time off not found" }, { status: 404 });
        }

        // Send email notification if status changed to APPROVED or REJECTED
        const statusChanged =
            normalizedStatus &&
            normalizedStatus !== (existingTimeOff as any)?.status;

        if (statusChanged && (normalizedStatus === "APPROVED" || normalizedStatus === "REJECTED")) {
            try {
                // Because Mongoose types can be strict, assert the populated user type
                const tech = updatedTimeOff.technicianId as any; 
                
                if (tech && tech.email && tech.companyId) {
                    const { sendOffTimeRequestEmail } = await import("@/lib/sendmailhelper");
                    
                    const templateName =
                        normalizedStatus === "APPROVED"
                            ? "off time request confirmation"
                            : "off time request cancellation";
                    
                    sendOffTimeRequestEmail(
                        templateName,
                        tech.email,
                        tech.companyId.toString(),
                        {
                            firstname: tech.firstName,
                            lastname: tech.lastName,
                            start_date: updatedTimeOff.startDate ? new Date(updatedTimeOff.startDate).toLocaleDateString() : "",
                            end_date: updatedTimeOff.endDate ? new Date(updatedTimeOff.endDate).toLocaleDateString() : "",
                            reason: updatedTimeOff.reason || "Time off request",
                            notes: updatedTimeOff.notes || "No notes provided",
                        }
                    ).catch(e => console.error(`Failed sending off-time ${templateName} email async:`, e));
                }
            } catch (e) {
                console.error("Failed to trigger time off email:", e);
            }
        }

        return NextResponse.json(updatedTimeOff);
    } catch (error: any) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e: any) => e.message);
            return NextResponse.json({ error: "Validation failed", details: messages }, { status: 400 });
        }
        console.error("Failed to update time off:", error);
        return NextResponse.json({ error: "Failed to update time off" }, { status: 500 });
    }
}
