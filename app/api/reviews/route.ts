import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Review } from "@/app/models/Review";
import { Booking } from "@/app/models/Booking";
import { User } from "@/app/models/User";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const reviewNote = String(body?.reviewNote ?? "").trim();
    const reviewTitle = String(body?.reviewTitle ?? "").trim();
    const starRating = Number(body?.starRating);
    const bookingId = body?.bookingId ? String(body.bookingId) : "";
    const technicianId = String(body?.technicianId ?? "");

    if (!reviewNote || !reviewTitle || !technicianId || Number.isNaN(starRating)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (starRating < 1 || starRating > 5) {
      return NextResponse.json({ error: "starRating must be between 1 and 5" }, { status: 400 });
    }

    if ((bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) || !mongoose.Types.ObjectId.isValid(technicianId)) {
      return NextResponse.json({ error: "Invalid bookingId or technicianId" }, { status: 400 });
    }

    await connectDB();

    const technician = await User.findById(technicianId)
      .select("_id role companyId")
      .lean();

    if (!technician || !["company_user", "employee"].includes(String(technician.role))) {
      return NextResponse.json({ error: "Invalid technician" }, { status: 400 });
    }

    if (currentUser.role !== "super_admin" && currentUser.companyId) {
      if (technician.companyId?.toString() !== currentUser.companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId)
        .select("_id companyId technicianId")
        .lean();

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (currentUser.role !== "super_admin" && currentUser.companyId) {
        if (booking.companyId?.toString() !== currentUser.companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      if (booking.technicianId?.toString() !== technicianId) {
        return NextResponse.json(
          { error: "Technician does not match the selected booking" },
          { status: 400 }
        );
      }

      const existingReview = await Review.findOne({
        bookingId,
        reviewerId: currentUser.userId,
      })
        .select("_id")
        .lean();
      if (existingReview) {
        return NextResponse.json(
          { error: "You have already submitted feedback for this booking." },
          { status: 409 }
        );
      }
    }

    const review = await Review.create({
      reviewNote,
      reviewTitle,
      starRating,
      ...(bookingId ? { bookingId } : {}),
      technicianId,
      reviewerId: currentUser.userId,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const technicianId = String(searchParams.get("technicianId") || "");
    const bookingId = String(searchParams.get("bookingId") || "");
    const mineOnly = searchParams.get("mine") === "1";
    const allReviews = searchParams.get("all") === "1";
    const reviewedBy = String(searchParams.get("reviewedBy") || "").toLowerCase();
    const limitRaw = Number(searchParams.get("limit") || "0");
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 0;
    if (!allReviews && !mineOnly && !technicianId && !bookingId && !reviewedBy) {
      return NextResponse.json({ error: "technicianId, bookingId, reviewedBy, all=1, or mine=1 is required" }, { status: 400 });
    }
    if (allReviews && !["super_admin", "company_admin"].includes(String(currentUser.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (technicianId && !mongoose.Types.ObjectId.isValid(technicianId)) {
      return NextResponse.json({ error: "Invalid technicianId" }, { status: 400 });
    }
    if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
    }

    await connectDB();

    let technicianCompanyId: string | undefined;
    if (technicianId) {
      const technician = await User.findById(technicianId)
        .select("_id companyId")
        .lean();
      if (!technician) {
        return NextResponse.json({ error: "Technician not found" }, { status: 404 });
      }
      technicianCompanyId = technician.companyId?.toString();
      if (currentUser.role !== "super_admin" && currentUser.companyId) {
        if (technicianCompanyId !== currentUser.companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId)
        .select("_id companyId")
        .lean();
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      if (currentUser.role !== "super_admin" && currentUser.companyId) {
        if (booking.companyId?.toString() !== currentUser.companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const query: any = {};
    if (technicianId) query.technicianId = technicianId;
    if (bookingId) query.bookingId = bookingId;
    if (mineOnly) query.reviewerId = currentUser.userId;

    const reviewsQuery = Review.find(query)
      .populate({ path: "reviewerId", select: "firstName lastName email role companyId" })
      .populate({ path: "technicianId", select: "firstName lastName companyId" })
      .sort({ createdAt: -1 })
      .lean();
    if (limit > 0) {
      reviewsQuery.limit(limit);
    }
    const reviews = await reviewsQuery;

    const mapped = reviews
      .filter((r: any) => {
        const reviewer = r?.reviewerId;
        const reviewerRole = String(reviewer?.role || "").toLowerCase();
        if (reviewedBy === "client" && reviewerRole !== "contact") return false;
        if (reviewedBy === "admin" && !["super_admin", "company_admin"].includes(reviewerRole)) return false;
        if (currentUser.role !== "super_admin" && currentUser.companyId) {
          const techCompanyId = r?.technicianId?.companyId?.toString?.() || "";
          if (techCompanyId && techCompanyId !== currentUser.companyId) return false;
        }
        return true;
      })
      .map((r: any) => {
      const reviewer = r?.reviewerId;
      const technician = r?.technicianId;
      const reviewerName = [reviewer?.firstName, reviewer?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || reviewer?.email || "Unknown";
      const technicianName = [technician?.firstName, technician?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "Technician";

      return {
        _id: r._id?.toString(),
        title: r.reviewTitle,
        rating: r.starRating,
        text: r.reviewNote,
        reviewer: reviewerName,
        reviewerRole: reviewer?.role || "",
        technicianName,
        technicianId: r?.technicianId?._id?.toString?.(),
        createdAt: r.createdAt,
        bookingId: r.bookingId?.toString?.(),
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
