import multer from "multer";
import path from "path";

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const allowedVideoMimeTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

const sanitizeSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]/g, "").trim();

const fileExtFromName = (fileName: string) => {
  const ext = path.extname(fileName || "").toLowerCase();
  return ext || "";
};

export function validateCleaningMediaFile(
  file: File,
  category: "image" | "video"
) {
  const ext = fileExtFromName(file.name);
  const mimeType = (file.type || "").toLowerCase();

  if (category === "image") {
    const validExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".jfif", ".heic", ".heif"].includes(ext);
    const validMime = allowedImageMimeTypes.has(mimeType) || mimeType.startsWith("image/");
    return validExt || validMime;
  }

  const validExt = [".mp4", ".webm", ".mov", ".avi"].includes(ext);
  const validMime = allowedVideoMimeTypes.has(mimeType) || mimeType.startsWith("video/");
  return validExt || validMime;
}

export function getCleaningMediaUploadConfig() {
  // Multer config kept centralized for limits/filtering consistency.
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max per file
      files: 8,
    },
  });
}

export function buildCleaningMediaRelativeDir(params: {
  companyId: string;
  bookingId: string;
  section: "before" | "after";
  kind: "images" | "video";
}) {
  const companyId = sanitizeSegment(params.companyId);
  const bookingId = sanitizeSegment(params.bookingId);
  return path.join(
    "public",
    "cleaning-media-uploads",
    companyId,
    bookingId,
    params.section,
    params.kind
  );
}

export function buildCleaningMediaUrl(params: {
  companyId: string;
  bookingId: string;
  section: "before" | "after";
  kind: "images" | "video";
  filename: string;
}) {
  return `/cleaning-media-uploads/${sanitizeSegment(params.companyId)}/${sanitizeSegment(
    params.bookingId
  )}/${params.section}/${params.kind}/${params.filename}`;
}

export function createStoredFilename(file: File) {
  const safeBase = path
    .basename(file.name || "file", path.extname(file.name || ""))
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .slice(0, 40) || "file";
  const ext = fileExtFromName(file.name) || ".bin";
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBase}${ext}`;
}
