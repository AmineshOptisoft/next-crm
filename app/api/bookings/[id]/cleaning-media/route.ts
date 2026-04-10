import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import {
  buildCleaningMediaRelativeDir,
  buildCleaningMediaUrl,
  createStoredFilename,
  validateCleaningMediaFile,
} from "@/lib/multer-cleaning-media";

const maxFileSize = 100 * 1024 * 1024;

async function saveMediaFile(params: {
  file: File;
  companyId: string;
  bookingId: string;
  section: "before" | "after";
  kind: "images" | "video";
}) {
  const fileName = createStoredFilename(params.file);
  const relativeDir = buildCleaningMediaRelativeDir({
    companyId: params.companyId,
    bookingId: params.bookingId,
    section: params.section,
    kind: params.kind,
  });
  const absoluteDir = path.join(process.cwd(), relativeDir);
  await mkdir(absoluteDir, { recursive: true });

  const bytes = await params.file.arrayBuffer();
  await writeFile(path.join(absoluteDir, fileName), Buffer.from(bytes));

  return buildCleaningMediaUrl({
    companyId: params.companyId,
    bookingId: params.bookingId,
    section: params.section,
    kind: params.kind,
    filename: fileName,
  });
}

export async function POST(
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const booking = await Booking.findOne({ _id: id, companyId: user.companyId }).lean();
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const beforeImageFiles = formData
      .getAll("beforeImages")
      .filter((entry): entry is File => entry instanceof File);
    const afterImageFiles = formData
      .getAll("afterImages")
      .filter((entry): entry is File => entry instanceof File);
    const videoFiles = formData
      .getAll("serviceVideo")
      .filter((entry): entry is File => entry instanceof File);

    if (beforeImageFiles.length !== 3 || afterImageFiles.length !== 3 || videoFiles.length !== 1) {
      return NextResponse.json(
        { error: "Please upload 3 before images, 3 after images, and 1 video." },
        { status: 400 }
      );
    }

    const allImagesAreValid = [...beforeImageFiles, ...afterImageFiles].every((file) => {
      if (file.size > maxFileSize) return false;
      return validateCleaningMediaFile(file, "image");
    });
    const allVideosAreValid = videoFiles.every((file) => {
      if (file.size > maxFileSize) return false;
      return validateCleaningMediaFile(file, "video");
    });

    if (!allImagesAreValid || !allVideosAreValid) {
      const invalidFiles = [...beforeImageFiles, ...afterImageFiles, ...videoFiles]
        .filter((file) => {
          const isVideo = videoFiles.includes(file);
          const validType = validateCleaningMediaFile(file, isVideo ? "video" : "image");
          const validSize = file.size <= maxFileSize;
          return !validType || !validSize;
        })
        .map((file) => ({
          name: file.name,
          type: file.type || "unknown",
          sizeInMb: Number((file.size / (1024 * 1024)).toFixed(2)),
        }));

      return NextResponse.json(
        {
          error: "Invalid file type/size. Allowed: image/* and video/* files (max 100MB each).",
          invalidFiles,
        },
        { status: 400 }
      );
    }

    const beforeUrls = await Promise.all(
      beforeImageFiles.map((file) =>
        saveMediaFile({
          file,
          companyId: user.companyId!,
          bookingId: id,
          section: "before",
          kind: "images",
        })
      )
    );

    const afterUrls = await Promise.all(
      afterImageFiles.map((file) =>
        saveMediaFile({
          file,
          companyId: user.companyId!,
          bookingId: id,
          section: "after",
          kind: "images",
        })
      )
    );

    const videoUrls = await Promise.all(
      videoFiles.map((file) =>
        saveMediaFile({
          file,
          companyId: user.companyId!,
          bookingId: id,
          section: "after",
          kind: "video",
        })
      )
    );

    const updateResult = await Booking.updateOne(
      { _id: id, companyId: user.companyId },
      {
        $set: {
          "cleaningMedia.beforeImages": beforeUrls,
          "cleaningMedia.afterImages": afterUrls,
          "cleaningMedia.videos": videoUrls,
        },
      }
    );

    const updatedBooking = await Booking.findOne(
      { _id: id, companyId: user.companyId },
      { cleaningMedia: 1 }
    ).lean();

    return NextResponse.json({
      message: "Cleaning media uploaded successfully",
      dbWrite: {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
      },
      media: {
        bookingId: id,
        uploadedBy: user.userId,
        images: {
          before: beforeUrls,
          after: afterUrls,
        },
        video: videoUrls,
      },
      urls: {
        beforeImages: beforeUrls,
        afterImages: afterUrls,
        videos: videoUrls,
      },
      bookingCleaningMedia: (updatedBooking as any)?.cleaningMedia || null,
    });
  } catch (error: any) {
    console.error("Cleaning media upload failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload cleaning media" },
      { status: 500 }
    );
  }
}
