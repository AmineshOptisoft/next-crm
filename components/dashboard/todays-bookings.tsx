"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { AppointmentDetails } from "@/components/appointments/appointment-details-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const AppointmentDetailsSheet = dynamic(
  () =>
    import("@/components/appointments/appointment-details-sheet").then(
      (m) => m.AppointmentDetailsSheet
    ),
  { ssr: false }
);

interface BookingItem {
  _id: string;
  orderId: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  status: string;
  serviceName?: string;
  notes?: string;
  units?: number;
  addons?: string;
  bookingPrice?: number;
  bookingDiscountPrice?: number;
  bookingDiscount?: number;
  billedHours?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  assignedStaff?: string;
  preferredTechnician?: string;
  teamCleaningTime?: number;
  technicianTime?: number;
  timesheetNotes?: string;
  gpsArrivalTime?: string | Date;
  gpsDepartureTime?: string | Date;
  cleaningMedia?: {
    beforeImages?: string[];
    afterImages?: string[];
    videos?: string[];
  };
}

interface TodaysBookingsProps {
  bookings: BookingItem[];
}

export function TodaysBookings({ bookings }: TodaysBookingsProps) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetails | null>(null);
  const [open, setOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [serviceVideo, setServiceVideo] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploaded, setMediaUploaded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  const mediaReady =
    beforeImages.length === 3 && afterImages.length === 3 && !!serviceVideo;
  const mergeImageSelections = (prev: File[], incoming: File[]) => {
    const merged = [...prev];
    for (const file of incoming) {
      const alreadyExists = merged.some(
        (f) =>
          f.name === file.name &&
          f.size === file.size &&
          f.lastModified === file.lastModified
      );
      if (!alreadyExists) {
        merged.push(file);
      }
      if (merged.length >= 3) break;
    }
    return merged.slice(0, 3);
  };
  const beforePreviewUrls = useMemo(
    () => beforeImages.map((file) => URL.createObjectURL(file)),
    [beforeImages]
  );
  const afterPreviewUrls = useMemo(
    () => afterImages.map((file) => URL.createObjectURL(file)),
    [afterImages]
  );
  const videoPreviewUrl = useMemo(
    () => (serviceVideo ? URL.createObjectURL(serviceVideo) : ""),
    [serviceVideo]
  );

  useEffect(() => {
    return () => {
      beforePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [beforePreviewUrls]);

  useEffect(() => {
    return () => {
      afterPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [afterPreviewUrls]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const handleOpenDetails = (booking: BookingItem) => {
    const appointment: AppointmentDetails = {
      id: booking._id,
      bookingId: booking._id,
      title: `Booking #${booking.orderId}`,
      start: new Date(booking.startDateTime),
      end: new Date(booking.endDateTime),
      status: booking.status as any,
      bookingStatus: booking.status,
      service: booking.serviceName,
      units: booking.units,
      addons: booking.addons,
      notes: booking.notes,
      bookingPrice: booking.bookingPrice,
      bookingDiscountPrice: booking.bookingDiscountPrice,
      bookingDiscount: booking.bookingDiscount,
      billedHours: booking.billedHours,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress,
      assignedStaff: booking.assignedStaff,
      preferredTechnician: booking.preferredTechnician,
      teamCleaningTime: booking.teamCleaningTime,
      technicianTime: booking.technicianTime,
      timesheetNotes: booking.timesheetNotes,
      gpsArrivalTime: booking.gpsArrivalTime
        ? new Date(booking.gpsArrivalTime).toLocaleString()
        : undefined,
      gpsDepartureTime: booking.gpsDepartureTime
        ? new Date(booking.gpsDepartureTime).toLocaleString()
        : undefined,
      cleaningMedia: {
        beforeImages: booking.cleaningMedia?.beforeImages || [],
        afterImages: booking.cleaningMedia?.afterImages || [],
        videos: booking.cleaningMedia?.videos || [],
      },
    };

    setSelectedAppointment(appointment);
    setBeforeImages([]);
    setAfterImages([]);
    setServiceVideo(null);
    setMediaUploaded(false);
    setUploadModalOpen(false);
    setOpen(true);
  };

  const uploadCleaningMedia = async () => {
    if (!selectedAppointment?.bookingId) return false;
    if (!mediaReady) {
      toast.error("Please add 3 before images, 3 after images, and 1 video.");
      return false;
    }

    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      beforeImages.forEach((file) => formData.append("beforeImages", file));
      afterImages.forEach((file) => formData.append("afterImages", file));
      if (serviceVideo) formData.append("serviceVideo", serviceVideo);

      const uploadRes = await fetch(
        `/api/bookings/${selectedAppointment.bookingId}/cleaning-media`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const uploadError = await uploadRes.json().catch(() => ({}));
        throw new Error(uploadError?.error || "Failed to upload cleaning media");
      }
      const uploadData = await uploadRes.json().catch(() => ({}));
      const uploadedBeforeUrls = uploadData?.urls?.beforeImages || [];
      const uploadedAfterUrls = uploadData?.urls?.afterImages || [];
      const uploadedVideos = uploadData?.urls?.videos || [];

      setSelectedAppointment((prev) =>
        prev
          ? {
              ...prev,
              cleaningMedia: {
                beforeImages: uploadedBeforeUrls,
                afterImages: uploadedAfterUrls,
                videos: uploadedVideos,
              },
            }
          : prev
      );

      setMediaUploaded(true);
      toast.success("Media uploaded to cleaning-media-uploads.");
      setUploadModalOpen(false);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload cleaning media."
      );
      return false;
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!selectedAppointment?.bookingId) return;
    if (!mediaUploaded) {
      toast.error("Please upload media first.");
      return;
    }

    try {
      setIsCompleting(true);
      const res = await fetch(`/api/bookings/${selectedAppointment.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) throw new Error("Failed to update booking status");

      toast.success("Booking marked as completed.");
      setOpen(false);
      setUploadModalOpen(false);
      setBeforeImages([]);
      setAfterImages([]);
      setServiceVideo(null);
      setMediaUploaded(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete booking.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <Card className="py-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Today's Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => (
              <button
                key={booking._id}
                type="button"
                className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted transition-colors"
                onClick={() => handleOpenDetails(booking)}
              >
                <p className="text-sm font-semibold">#{booking.orderId}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.startDateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(booking.endDateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {booking.status.replaceAll("_", " ")}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAppointment && (
        <>
          <AppointmentDetailsSheet
            appointment={selectedAppointment}
            open={open}
            onOpenChange={setOpen}
            readOnly
            footerContent={
              <>
                {selectedAppointment.bookingStatus === "confirmed" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setUploadModalOpen(true)}
                      disabled={isCompleting}
                    >
                      Upload
                    </Button>
                    <Button
                      className="bg-green-500 hover:bg-green-600 disabled:opacity-60"
                      disabled={!mediaUploaded || isCompleting}
                      onClick={handleCompleteBooking}
                    >
                      {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Complete
                    </Button>
                  </>
                )}
              </>
            }
          />

          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Upload Service Media</DialogTitle>
                <DialogDescription>
                  Add 3 before images, 3 after images, and 1 service video.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Before Images (3)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setBeforeImages((prev) => mergeImageSelections(prev, files));
                      setMediaUploaded(false);
                      e.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selected: {beforeImages.length}/3
                  </p>
                  {beforeImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {beforeImages.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="relative rounded-md border overflow-hidden">
                          <img
                            src={beforePreviewUrls[index]}
                            alt={`Before ${index + 1}`}
                            className="h-20 w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1"
                            onClick={() =>
                              setBeforeImages((prev) => {
                                setMediaUploaded(false);
                                return prev.filter((_, i) => i !== index);
                              })
                            }
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>After Images (3)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setAfterImages((prev) => mergeImageSelections(prev, files));
                      setMediaUploaded(false);
                      e.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selected: {afterImages.length}/3
                  </p>
                  {afterImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {afterImages.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="relative rounded-md border overflow-hidden">
                          <img
                            src={afterPreviewUrls[index]}
                            alt={`After ${index + 1}`}
                            className="h-20 w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1"
                            onClick={() =>
                              setAfterImages((prev) => {
                                setMediaUploaded(false);
                                return prev.filter((_, i) => i !== index);
                              })
                            }
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Service Video (1)</Label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setServiceVideo(file);
                      setMediaUploaded(false);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {serviceVideo ? "1 video selected" : "No video selected"}
                  </p>
                  {serviceVideo && (
                    <div className="relative rounded-md border overflow-hidden">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full max-h-44 bg-black"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1"
                        onClick={() => {
                          setServiceVideo(null);
                          setMediaUploaded(false);
                        }}
                        aria-label="Remove video"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={uploadCleaningMedia}
                  disabled={!mediaReady || isUploadingMedia || isCompleting}
                >
                  {isUploadingMedia && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mediaUploaded ? "Uploaded" : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
