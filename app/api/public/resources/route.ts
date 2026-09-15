import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { Company } from "@/app/models/Company";
import { ZipCode } from "@/app/models/ZipCode";
import { Booking } from "@/app/models/Booking";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import mongoose from "mongoose";

function normalizeId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value._id === "string") return value._id;
  }
  return value.toString?.() || "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("companyId");
    const subdomainParam = searchParams.get("subdomain");

    if (!companyIdParam && !subdomainParam) {
      return NextResponse.json(
        { error: "companyId or subdomain parameter is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let companyObjId: mongoose.Types.ObjectId | null = null;

    if (companyIdParam && mongoose.Types.ObjectId.isValid(companyIdParam)) {
      companyObjId = new mongoose.Types.ObjectId(companyIdParam);
    } else if (subdomainParam) {
      const comp = await Company.findOne({
        $or: [
          { subdomain: subdomainParam.toLowerCase() },
          { "publicSites.subdomain": subdomainParam.toLowerCase() },
        ],
      })
        .select("_id")
        .lean();
      if (comp) {
        companyObjId = comp._id as mongoose.Types.ObjectId;
      }
    }

    if (!companyObjId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyIdStr = companyObjId.toString();

    // 1. Fetch ZipCodes for company to map _id -> string zip code
    const zipCodes = await ZipCode.find({ companyId: companyIdStr })
      .select("_id code")
      .lean();

    const zipMap = new Map<string, string>();
    for (const z of zipCodes as any[]) {
      if (z && z._id && z.code) {
        zipMap.set(z._id.toString(), String(z.code));
      }
    }

    // 2. Fetch active technicians for company
    const technicians = await User.find({
      companyId: companyIdStr,
      role: { $in: ["company_user", "employee"] },
      isActive: true,
      isTechnicianActive: true,
    })
      .select(
        "firstName lastName zone availability services workingZipCodes customRoleId defaultRoleName"
      )
      .populate("customRoleId", "name")
      .lean();

    const resources: any[] = [];

    for (const tech of technicians as any[]) {
      const techId = tech._id.toString();

      const techZipCodes: string[] = (tech.workingZipCodes || [])
        .map((raw: any) => {
          const key = raw?.toString?.() ?? "";
          if (!key) return undefined;
          const mapped = zipMap.get(key);
          if (mapped) return mapped;
          return key;
        })
        .filter((v: any) => typeof v === "string") as string[];

      const serviceIds: string[] = (tech.services || [])
        .map((s: any) => normalizeId(s))
        .filter(Boolean);

      resources.push({
        id: techId,
        _id: techId,
        firstName: tech.firstName,
        lastName: tech.lastName,
        title: `${tech.firstName || ""} ${tech.lastName || ""}`.trim(),
        group: tech.zone || "Unassigned",
        services: serviceIds,
        workingZipCodes: techZipCodes,
        isActive: true,
        isTechnicianActive: true,
        isSubstituteTechnician:
          tech?.defaultRoleName === "Substitute Technician" ||
          tech?.customRoleId?.name === "Substitute Technician" ||
          `${tech?.firstName || ""} ${tech?.lastName || ""}`
            .toLowerCase()
            .includes("substitute technician"),
      });
    }

    // 3. Fetch sanitized booking events for availability check
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

    const bookings = await Booking.find({
      companyId: companyObjId,
      status: { $nin: ["cancelled", "rejected", "deleted", "no_show"] },
      startDateTime: { $gte: startDate, $lte: endDate },
    })
      .select("technicianId startDateTime endDateTime status")
      .lean();

    const bookingEvents = (bookings as any[]).map((b) => ({
      id: `booking-${b._id}`,
      resourceId: b.technicianId?.toString(),
      start: b.startDateTime,
      end: b.endDateTime,
      type: "booking",
    }));

    // 4. Fetch approved time-off events
    const timeOffs = await TechnicianTimeOff.find({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: "APPROVED",
    })
      .select("technicianId startDate endDate startTime endTime status")
      .lean();

    const timeOffEvents = (timeOffs as any[]).map((off) => ({
      id: `timeoff-${off._id}`,
      resourceId: off.technicianId?.toString(),
      start: off.startDate,
      end: off.endDate,
      type: "unavailability",
    }));

    return NextResponse.json({
      resources,
      events: [...bookingEvents, ...timeOffEvents],
    });
  } catch (error: any) {
    console.error("Error fetching public resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch public resources" },
      { status: 500 }
    );
  }
}
