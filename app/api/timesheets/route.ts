import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";

function toStartOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toEndOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const technicianId = searchParams.get("technicianId");
    const appointmentNumber = searchParams.get("appointmentNumber")?.trim();

    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || "25") || 25));
    const skip = (page - 1) * limit;

    const now = new Date();
    const from = fromParam ? toStartOfDay(new Date(fromParam)) : toStartOfDay(now);
    const to = toParam ? toEndOfDay(new Date(toParam)) : toEndOfDay(now);

    await connectDB();

    const match: any = {
      companyId: new mongoose.Types.ObjectId(user.companyId),
      startDateTime: { $gte: from, $lte: to },
      status: { $ne: "deleted" },
    };

    if (technicianId) {
      match.technicianId = new mongoose.Types.ObjectId(technicianId);
    }
    if (appointmentNumber) {
      match.orderId = appointmentNumber;
    }

    const pipeline: any[] = [
      { $match: match },
      { $sort: { startDateTime: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "contactId",
          foreignField: "_id",
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
          as: "_contact",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "technicianId",
          foreignField: "_id",
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
          as: "_technician",
        },
      },
      {
        $project: {
          orderId: 1,
          recurringGroupId: 1,
          technicianId: 1,
          startDateTime: 1,
          endDateTime: 1,
          pricing: 1,
          timesheet: 1,
          contact: { $arrayElemAt: ["$_contact", 0] },
          technician: { $arrayElemAt: ["$_technician", 0] },
        },
      },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Booking.aggregate(pipeline);
    const rawRows: any[] = result?.rows || [];

    // ── Co-tech team members (same slot) ───────────────────────────────────────
    // Slot key = recurringGroupId + startDateTime (matches how the app syncs edits)
    const slotOr: any[] = [];
    for (const r of rawRows) {
      if (!r?.recurringGroupId || !r?.startDateTime) continue;
      slotOr.push({
        recurringGroupId: r.recurringGroupId,
        startDateTime: r.startDateTime,
        companyId: new mongoose.Types.ObjectId(user.companyId),
      });
    }

    const slotKeyToTechNames = new Map<string, string[]>();
    if (slotOr.length > 0) {
      const slotDocs = await Booking.aggregate([
        { $match: { $or: slotOr } },
        {
          $lookup: {
            from: "users",
            localField: "technicianId",
            foreignField: "_id",
            pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
            as: "_technician",
          },
        },
        {
          $project: {
            recurringGroupId: 1,
            startDateTime: 1,
            technicianName: {
              $let: {
                vars: { t: { $arrayElemAt: ["$_technician", 0] } },
                in: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$$t.firstName", ""] },
                        " ",
                        { $ifNull: ["$$t.lastName", ""] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      for (const d of slotDocs as any[]) {
        const key = `${d.recurringGroupId}::${new Date(d.startDateTime).toISOString()}`;
        const name = String(d.technicianName || "").trim();
        if (!name) continue;
        const arr = slotKeyToTechNames.get(key);
        arr ? arr.push(name) : slotKeyToTechNames.set(key, [name]);
      }
    }

    const rows = rawRows.map((b: any) => {
      const clientName = `${b.contact?.firstName || ""} ${b.contact?.lastName || ""}`.trim();
      const technicianName = `${b.technician?.firstName || ""} ${b.technician?.lastName || ""}`.trim();

      const slotKey =
        b?.recurringGroupId && b?.startDateTime
          ? `${b.recurringGroupId}::${new Date(b.startDateTime).toISOString()}`
          : null;
      const allTechsForSlot = slotKey ? slotKeyToTechNames.get(slotKey) || [] : [];
      const otherTechs = allTechsForSlot.filter((n) => n && n !== technicianName);

      const manualMembers: string[] = Array.isArray(b.timesheet?.teamMembers) ? b.timesheet.teamMembers : [];
      const teamMembers = Array.from(new Set([...otherTechs, ...manualMembers])).filter(Boolean);

      return {
        bookingId: b._id?.toString?.() ?? String(b._id),
        orderId: b.orderId,
        startDateTime: b.startDateTime,
        endDateTime: b.endDateTime,
        clientName: clientName || "-",
        technicianName: technicianName || "-",
        cleaningTime: b.timesheet?.cleaningTime ?? 0,
        totalTeamTime: b.timesheet?.totalTeamTime ?? 0,
        generalTime: b.timesheet?.generalTime ?? 0,
        drivingTime: b.timesheet?.drivingTime ?? 0,
        trainingTime: b.timesheet?.trainingTime ?? 0,
        teamMembers,
        billedHours: b.pricing?.billedHours ?? 0,
        timesheetNotes: b.timesheet?.notes ?? "",
      };
    });

    const total = result?.total?.[0]?.count ?? 0;

    // Totals for current page (simple + fast). If you want totals across the whole filter range,
    // we can add another facet aggregation.
    const totals = rows.reduce(
      (acc: any, r: any) => {
        acc.cleaningTime += Number(r.cleaningTime) || 0;
        acc.totalTeamTime += Number(r.totalTeamTime) || 0;
        acc.generalTime += Number(r.generalTime) || 0;
        acc.drivingTime += Number(r.drivingTime) || 0;
        acc.trainingTime += Number(r.trainingTime) || 0;
        acc.billedHours += Number(r.billedHours) || 0;
        return acc;
      },
      { cleaningTime: 0, totalTeamTime: 0, generalTime: 0, drivingTime: 0, trainingTime: 0, billedHours: 0 }
    );

    return NextResponse.json({
      page,
      limit,
      total,
      rows,
      totals,
    });
  } catch (error: any) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json({ error: "Failed to fetch timesheets" }, { status: 500 });
  }
}

