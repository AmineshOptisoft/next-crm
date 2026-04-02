import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "contact") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const pageRaw = Number(sp.get("page") || "1");
    const limitRaw = Number(sp.get("limit") || "10");
    const bookingType = (sp.get("bookingType") || "upcoming").toLowerCase();
    const query = (sp.get("query") || "").trim();
    const startDateRaw = sp.get("startDate");
    const endDateRaw = sp.get("endDate");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;

    const now = new Date();
    const baseFilter: any = {
      companyId: user.companyId,
      contactId: user.userId,
    };

    const hasCustomDateRange = Boolean(startDateRaw || endDateRaw);
    if (hasCustomDateRange) {
      const range: Record<string, Date> = {};
      if (startDateRaw) {
        const parsedStart = new Date(startDateRaw);
        if (!Number.isNaN(parsedStart.getTime())) {
          range.$gte = parsedStart;
        }
      }
      if (endDateRaw) {
        const parsedEnd = new Date(endDateRaw);
        if (!Number.isNaN(parsedEnd.getTime())) {
          range.$lte = parsedEnd;
        }
      }
      if (Object.keys(range).length > 0) {
        baseFilter.startDateTime = range;
      }
    } else if (bookingType === "previous") {
      baseFilter.startDateTime = { $lt: now };
    } else {
      baseFilter.startDateTime = { $gte: now };
    }

    if (query) {
      baseFilter.$or = [
        { orderId: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
      ];
    }

    const [bookings, total, upcomingCount, previousCount] = await Promise.all([
      Booking.find(baseFilter)
      .populate("serviceId", "name")
      .populate("technicianId", "firstName lastName")
      .sort({ startDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
      Booking.countDocuments(baseFilter),
      Booking.countDocuments({
        companyId: user.companyId,
        contactId: user.userId,
        startDateTime: { $gte: now },
      }),
      Booking.countDocuments({
        companyId: user.companyId,
        contactId: user.userId,
        startDateTime: { $lt: now },
      }),
    ]);

    const payload = bookings.map((booking: any) => {
      const startDate = new Date(booking.startDateTime);
      const bookingType =
        startDate.getTime() < now.getTime() ? "previous" : "upcoming";

      return {
        _id: booking._id.toString(),
        orderId: booking.orderId || "",
        status: booking.status || "unconfirmed",
        bookingType,
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime,
        serviceName: booking.serviceId?.name || "Service",
        technicianName:
          [booking.technicianId?.firstName, booking.technicianId?.lastName]
            .filter(Boolean)
            .join(" ") || "Unassigned",
        finalAmount: Number(booking.pricing?.finalAmount || 0),
        address: [
          booking.shippingAddress?.street,
          booking.shippingAddress?.city,
          booking.shippingAddress?.state,
          booking.shippingAddress?.zipCode,
        ]
          .filter(Boolean)
          .join(", "),
      };
    });

    return NextResponse.json({
      bookings: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      counts: {
        upcoming: upcomingCount,
        previous: previousCount,
      },
    });
  } catch (error) {
    console.error("Error fetching client bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
