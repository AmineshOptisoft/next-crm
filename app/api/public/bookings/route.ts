import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import { TechnicianTimeOff } from "@/app/models/TechnicianTimeOff";
import { User } from "@/app/models/User";
import { Role } from "@/app/models/Role";
import { ZipCode } from "@/app/models/ZipCode";
import mongoose from "mongoose";

function generateOrderId() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;
}

function normalizeId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value._id === "string") return value._id;
    if (value._id && value._id !== value && typeof value._id.toString === "function") {
      const nested = value._id.toString();
      if (nested && nested !== "[object Object]") return nested;
    }
  }
  if (typeof value?.toString === "function") {
    const s = value.toString();
    if (s && s !== "[object Object]") return s;
  }
  return "";
}

async function isSubstituteTechnician(userDoc: any): Promise<boolean> {
  if (!userDoc) return false;
  if (userDoc.defaultRoleName === "Substitute Technician") return true;
  const fullName = `${userDoc.firstName || ""} ${userDoc.lastName || ""}`.toLowerCase();
  if (fullName.includes("substitute technician")) return true;
  if (userDoc.customRoleId) {
    const role = await Role.findById(userDoc.customRoleId).select("name").lean();
    return role?.name === "Substitute Technician";
  }
  return false;
}

async function hasConflict(
  companyObjId: mongoose.Types.ObjectId,
  technicianObjId: mongoose.Types.ObjectId,
  start: Date,
  end: Date,
  allowOverlapBookings: boolean
) {
  if (!allowOverlapBookings) {
    const overlappingBooking = await Booking.findOne({
      companyId: companyObjId,
      technicianId: technicianObjId,
      status: { $nin: ["cancelled", "rejected", "deleted", "no_show"] },
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    })
      .select("_id")
      .lean();
    if (overlappingBooking) return true;
  }

  const overlappingTimeOff = await TechnicianTimeOff.findOne({
    technicianId: technicianObjId,
    status: "APPROVED",
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select("_id")
    .lean();
  return Boolean(overlappingTimeOff);
}

async function findSubstituteTechnician(
  companyObjId: mongoose.Types.ObjectId,
  zipCode: string | undefined,
  serviceObjId: mongoose.Types.ObjectId,
  start: Date,
  end: Date
): Promise<mongoose.Types.ObjectId | null> {
  const substituteRoleIds = (
    await Role.find({
      companyId: companyObjId,
      name: "Substitute Technician",
      isActive: true,
    })
      .select("_id")
      .lean()
  ).map((r: any) => r._id);

  const selectedZip = (zipCode || "").toString().replace(/\s+/g, "").toLowerCase();
  const zipDocs = await ZipCode.find({ companyId: companyObjId }).select("_id code").lean();
  const zipMap = new Map<string, string>();
  for (const z of zipDocs as any[]) {
    const id = z?._id?.toString?.();
    const code = String(z?.code || "");
    if (id && code) zipMap.set(id, code);
  }
  const candidates = await User.find({
    companyId: companyObjId,
    isActive: true,
    isTechnicianActive: true,
    role: { $in: ["company_user", "employee"] },
  })
    .select("_id firstName lastName customRoleId defaultRoleName services workingZipCodes")
    .lean();

  for (const tech of candidates as any[]) {
    const byRoleOrName = await isSubstituteTechnician(tech);
    const byCustomRole = substituteRoleIds.some((id: any) => normalizeId(id) === normalizeId(tech.customRoleId));
    if (!byRoleOrName && !byCustomRole) continue;

    const workingZips = Array.isArray(tech.workingZipCodes) ? tech.workingZipCodes : [];
    if (selectedZip) {
      const servesZip = workingZips.some(
        (z: any) => {
          const raw = String(z || "");
          const mapped = zipMap.get(raw) || raw;
          return mapped.replace(/\s+/g, "").toLowerCase() === selectedZip;
        }
      );
      if (!servesZip) continue;
    }

    // Substitute is a temporary holding technician.
    // Do not block by service or overlapping availability constraints here.
    return new mongoose.Types.ObjectId(tech._id);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      companyId,
      contactId,
      technicianId,
      serviceId,
      subServices = [],
      addons = [],
      startDateTime,
      endDateTime,
      notes,
      specialRequestFromClient,
      hasPets,
      pets = [],
      pricing,
      zipCode,
    } = body || {};

    if (
      !companyId ||
      !contactId ||
      !technicianId ||
      !serviceId ||
      !startDateTime ||
      !endDateTime
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { error: "Invalid start or end time" },
        { status: 400 }
      );
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const bookingDayStart = new Date(start);
    bookingDayStart.setHours(0, 0, 0, 0);
    if (bookingDayStart < todayStart) {
      return NextResponse.json(
        { error: "Booking date cannot be before today" },
        { status: 400 }
      );
    }
    let technicianObjId = new mongoose.Types.ObjectId(technicianId);
    const companyObjId = new mongoose.Types.ObjectId(companyId);
    const serviceObjId = new mongoose.Types.ObjectId(serviceId);

    const selectedTechnician = await User.findOne({
      _id: technicianObjId,
      companyId: companyObjId,
      isActive: true,
      isTechnicianActive: true,
      role: { $in: ["company_user", "employee"] },
    })
      .select("_id firstName lastName customRoleId defaultRoleName zone services workingZipCodes")
      .lean();

    if (!selectedTechnician) {
      return NextResponse.json(
        { error: "Technician is not available at this time. Select different time." },
        { status: 400 }
      );
    }

    const selectedIsSubstitute = await isSubstituteTechnician(selectedTechnician);

    if (selectedIsSubstitute) {
      // If substitute is selected but any regular tech can take booking
      // for the requested zip/service/time, assign that regular technician instead.
      // assign that regular technician instead.
      const selectedZip = (zipCode || "").toString().replace(/\s+/g, "").toLowerCase();
      const zipDocs = await ZipCode.find({ companyId: companyObjId }).select("_id code").lean();
      const zipMap = new Map<string, string>();
      for (const z of zipDocs as any[]) {
        const id = z?._id?.toString?.();
        const code = String(z?.code || "");
        if (id && code) zipMap.set(id, code);
      }

      const regularTechs = await User.find({
        companyId: companyObjId,
        _id: { $ne: technicianObjId },
        isActive: true,
        isTechnicianActive: true,
        role: { $in: ["company_user", "employee"] },
      })
        .select("_id firstName lastName customRoleId defaultRoleName services workingZipCodes")
        .lean();

      for (const tech of regularTechs as any[]) {
        if (await isSubstituteTechnician(tech)) continue;

        const workingZips = Array.isArray(tech.workingZipCodes) ? tech.workingZipCodes : [];
        if (selectedZip) {
          const servesZip = workingZips.some((z: any) => {
            const raw = String(z || "");
            const mapped = zipMap.get(raw) || raw;
            return mapped.replace(/\s+/g, "").toLowerCase() === selectedZip;
          });
          if (!servesZip) continue;
        }

        const services = Array.isArray(tech.services) ? tech.services.map((s: any) => normalizeId(s)) : [];
        if (services.length > 0 && !services.includes(serviceObjId.toString())) continue;

        const regularConflict = await hasConflict(
          companyObjId,
          new mongoose.Types.ObjectId(tech._id),
          start,
          end,
          false
        );
        if (!regularConflict) {
          technicianObjId = new mongoose.Types.ObjectId(tech._id);
          break;
        }
      }

      // Keep selected substitute assignment even if overlapping/unavailable.
    } else {
      // Non-substitute technicians cannot have overlapping bookings and cannot be on approved leave.
      const hasSelectedConflict = await hasConflict(
        companyObjId,
        technicianObjId,
        start,
        end,
        false
      );
      if (hasSelectedConflict) {
        const substituteId = await findSubstituteTechnician(
          companyObjId,
          zipCode,
          serviceObjId,
          start,
          end
        );
        if (!substituteId) {
          return NextResponse.json(
            { error: "Technician is not available at this time. Select different time." },
            { status: 400 }
          );
        }
        technicianObjId = substituteId;
      }
    }

    const booking = await Booking.create({
      orderId: generateOrderId(),
      contactId: new mongoose.Types.ObjectId(contactId),
      technicianId: technicianObjId,
      serviceId: serviceObjId,
      subServices,
      addons,
      bookingType: "once",
      startDateTime: start,
      endDateTime: end,
      shippingAddress: zipCode ? { zipCode } : undefined,
      notes,
      specialRequestFromClient:
        typeof specialRequestFromClient === "string" && specialRequestFromClient.trim()
          ? specialRequestFromClient.trim()
          : undefined,
      hasPets: typeof hasPets === "boolean" ? hasPets : undefined,
      pets: Array.isArray(pets) ? pets.filter((p: any) => typeof p === "string") : [],
      pricing,
      companyId: companyObjId,
      status: "unconfirmed",
    });

    return NextResponse.json({ id: booking._id }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating public booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

