import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";

// GET - Fetch single booking
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || (!user.companyId && user.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        const booking = await Booking.findOne({ _id: id, companyId: user.companyId })
            .populate("contactId")
            .populate("serviceId")
            .populate("technicianId")
            .populate("subServices.serviceId") // Populate subservice details if needed, usually just ID is enough for matching but name is good
            .populate("addons.serviceId");

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error("Error fetching booking:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { id } = await params;
        const body = await req.json();

        // Find existing booking
        const booking = await Booking.findOne({ _id: id, companyId: user.companyId });
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Update allowed fields
        const allowedUpdates = [
            "status", "serviceId", "subServices", "addons",
            "startDateTime", "endDateTime", "notes",
            "shippingAddress", "pricing", "technicianId", "technicianIds"
        ];

        allowedUpdates.forEach((field) => {
            if (body[field] !== undefined) {
                booking[field] = body[field];
            }
        });

        await booking.save();

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error("Error updating booking:", error);
        return NextResponse.json(
            { error: "Failed to update booking" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.companyId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        const booking = await Booking.findOneAndDelete({ _id: id, companyId: user.companyId });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Booking deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting booking:", error);
        return NextResponse.json(
            { error: "Failed to delete booking" },
            { status: 500 }
        );
    }
}
