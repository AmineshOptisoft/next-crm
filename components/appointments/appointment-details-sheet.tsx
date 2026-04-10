"use client";

import { useEffect, useMemo, useState, memo, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, CreditCard, Pencil, Trash2, XCircle, FileText, DollarSign, Archive, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import useSWR from "swr";

const EditBookingDetailsDialog = dynamic(
  () => import("./edit-booking-details-dialog").then((m) => m.EditBookingDetailsDialog),
  { ssr: false }
);
const BillClientModal = dynamic(
  () => import("./bill-client-modal").then((m) => m.BillClientModal),
  { ssr: false }
);

type DisplayValue = string | number | null | undefined;

const KeyValueRow = memo(function KeyValueRow({ label, value }: { label: string; value: DisplayValue }) {
  const v = value === null || value === undefined || value === "" ? "-" : String(value);
  return (
    <div className="grid grid-cols-[190px_10px_1fr] gap-x-2 text-sm">
      <div className="text-foreground">{label}</div>
      <div className="text-muted-foreground">:</div>
      <div className="text-foreground break-words">{v}</div>
    </div>
  );
});

export interface AppointmentDetails {
  id: string;
  bookingId?: string;
  title: string;
  start: Date;
  end: Date;
  status?: "confirmed" | "unconfirmed" | "completed" | "cancelled";
  bookingStatus?: DisplayValue;

  // Appointment Details
  service?: DisplayValue;
  units?: DisplayValue;
  addons?: DisplayValue;
  notes?: DisplayValue;
  preferences?: DisplayValue;
  billingNotes?: DisplayValue;
  billedAmount?: DisplayValue;
  billedHours?: DisplayValue;
  bookingPrice?: DisplayValue;
  bookingDiscountPrice?: DisplayValue;
  bookingDiscount?: DisplayValue;
  estimatedBilledAmount?: DisplayValue;
  estimatedBilledHours?: DisplayValue;
  scheduledDuration?: DisplayValue;
  teamCleaningTime?: DisplayValue;
  technicianTime?: DisplayValue;
  timesheetNotes?: DisplayValue;
  gpsArrivalTime?: DisplayValue;
  gpsDepartureTime?: DisplayValue;

  // Customer Details
  customerName?: DisplayValue;
  customerEmail?: DisplayValue;
  customerPhone?: DisplayValue;
  customerAddress?: DisplayValue;
  familyInfo?: DisplayValue;
  parkingAccess?: DisplayValue;
  clientNotesFromTech?: DisplayValue;
  specialInstructionsFromClient?: DisplayValue;
  specialInstructionsFromAdmin?: DisplayValue;
  specialRequestFromClient?: DisplayValue;

  // Staff Details
  assignedStaff?: DisplayValue;
  preferredTechnician?: DisplayValue;
  technicianId?: string;

  // Co-technicians on shared bookings
  coTechnicians?: string[];
  cleaningMedia?: {
    beforeImages?: string[];
    afterImages?: string[];
    videos?: string[];
  };
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

interface AppointmentDetailsSheetProps {
  appointment?: AppointmentDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  /** When true, shows booking data only with no action buttons or editing */
  readOnly?: boolean;
  /** Optional top-right manage action, useful in read-only contexts */
  onManageBooking?: () => void;
  manageBookingLabel?: string;
  /** Optional custom footer for read-only contexts (e.g. dashboard widgets). */
  footerContent?: ReactNode;
}

export function AppointmentDetailsSheet({
  appointment,
  open,
  onOpenChange,
  onUpdate,
  readOnly = false,
  onManageBooking,
  manageBookingLabel = "Manage Booking",
  footerContent,
}: AppointmentDetailsSheetProps) {
  if (!appointment) return null;

  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  /** Tracks which button's action is in progress; loader shows only on that button */
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const router = useRouter();
  const isLoading = loadingAction !== null;
  const { data: meData } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const { data: myBookingReviews, mutate: mutateMyBookingReviews } = useSWR(
    appointment.bookingId ? `/api/reviews?bookingId=${appointment.bookingId}&mine=1` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );
  const { data: bookingDetailsData } = useSWR(
    appointment.bookingId ? `/api/bookings/${appointment.bookingId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );
  const reviewerName = useMemo(() => {
    const first = meData?.user?.firstName ?? "";
    const last = meData?.user?.lastName ?? "";
    const fullName = [first, last].filter(Boolean).join(" ").trim();
    return fullName || meData?.user?.email || "";
  }, [meData?.user?.email, meData?.user?.firstName, meData?.user?.lastName]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    text: "",
    reviewer: "",
  });
  const hasAlreadyReviewedThisBooking = Array.isArray(myBookingReviews) && myBookingReviews.length > 0;
  const canShowFeedbackButton =
    appointment.bookingStatus === "completed" &&
    !!appointment.bookingId &&
    !!appointment.technicianId &&
    !hasAlreadyReviewedThisBooking;

  useEffect(() => {
    if (!reviewerName) return;
    setNewReview((prev) => ({ ...prev, reviewer: reviewerName }));
  }, [reviewerName]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoadingAction(newStatus);
      const res = await fetch(`/api/bookings/${appointment.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Booking status updated to ${newStatus.replace("_", " ")}`);
      onOpenChange(false);
      onUpdate?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    try {
      setLoadingAction("delete");
      const res = await fetch(`/api/bookings/${appointment.bookingId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete booking");

      toast.success("Booking deleted successfully");
      onOpenChange(false);
      onUpdate?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete booking");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveFeedback = async () => {
    if (!appointment.bookingId || !appointment.technicianId) {
      toast.error("Missing booking or technician details for review.");
      return;
    }
    if (!newReview.title.trim() || !newReview.text.trim()) return;

    try {
      setSavingFeedback(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewTitle: newReview.title.trim(),
          reviewNote: newReview.text.trim(),
          starRating: newReview.rating,
          bookingId: appointment.bookingId,
          technicianId: appointment.technicianId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save review");
      }

      toast.success("Feedback saved successfully.");
      setIsFeedbackSheetOpen(false);
      await mutateMyBookingReviews();
      setNewReview({
        rating: 5,
        title: "",
        text: "",
        reviewer: reviewerName,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to save review");
    } finally {
      setSavingFeedback(false);
    }
  };

  const renderValue = (value: DisplayValue) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const formatDateTime = (date?: Date) => {
    if (!date) return "-";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const beforeImages: string[] = Array.isArray(appointment.cleaningMedia?.beforeImages)
    ? appointment.cleaningMedia!.beforeImages!
    : Array.isArray(bookingDetailsData?.cleaningMedia?.beforeImages)
    ? bookingDetailsData.cleaningMedia.beforeImages
    : [];
  const afterImages: string[] = Array.isArray(appointment.cleaningMedia?.afterImages)
    ? appointment.cleaningMedia!.afterImages!
    : Array.isArray(bookingDetailsData?.cleaningMedia?.afterImages)
    ? bookingDetailsData.cleaningMedia.afterImages
    : [];
  const videos: string[] = Array.isArray(appointment.cleaningMedia?.videos)
    ? appointment.cleaningMedia!.videos!
    : Array.isArray(bookingDetailsData?.cleaningMedia?.videos)
    ? bookingDetailsData.cleaningMedia.videos
    : [];
  const hasCleaningMedia =
    beforeImages.length > 0 || afterImages.length > 0 || videos.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
        <SheetHeader className="p-4 border-b gap-0 ">
          <SheetTitle className="">Booking Details</SheetTitle>
          <SheetDescription>{appointment.title}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {(!readOnly || onManageBooking) && (
            <div className="flex justify-end">
              {onManageBooking ? (
                <Button variant="default" className="w-fit" onClick={onManageBooking}>
                  {manageBookingLabel}
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-fit"
                  onClick={() => setEditBookingOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Booking Detail
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-[190px_10px_1fr] gap-x-2 text-sm">
              <div className="text-foreground">Booking Status</div>
              <div className="text-muted-foreground">:</div>
              <div className="font-semibold text-primary">
                {renderValue(appointment.bookingStatus)}
              </div>
            </div>
            <KeyValueRow label="Start" value={formatDateTime(appointment.start)} />
            <KeyValueRow label="End" value={formatDateTime(appointment.end)} />
            {appointment.coTechnicians && appointment.coTechnicians.length > 0 && (
              <div className="grid grid-cols-[190px_10px_1fr] gap-x-2 text-sm">
                <div className="text-foreground">Working With</div>
                <div className="text-muted-foreground">:</div>
                <div className="text-foreground font-medium">
                  {appointment.coTechnicians.join(", ")}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <KeyValueRow label="Service" value={appointment.service} />
            <KeyValueRow label="Units" value={appointment.units} />
            <KeyValueRow label="Addons" value={appointment.addons} />
            <KeyValueRow label="Appointment notes" value={appointment.notes} />
            <KeyValueRow label="Preferences" value={appointment.preferences} />
            <KeyValueRow label="Billing Notes" value={appointment.billingNotes} />
            <KeyValueRow label="Billed Amount" value={appointment.billedAmount} />
            <KeyValueRow label="Billed Hours" value={appointment.billedHours} />
            <KeyValueRow label="Booking Price" value={appointment.bookingPrice} />
            <KeyValueRow label="Booking Discount Price" value={appointment.bookingDiscountPrice} />
            <KeyValueRow label="Booking Discount" value={appointment.bookingDiscount} />
            <KeyValueRow label="Estimated Billed Amount" value={appointment.estimatedBilledAmount} />
            <KeyValueRow label="Estimated Billed Hours" value={appointment.estimatedBilledHours} />
            <KeyValueRow label="Scheduled Duration" value={appointment.scheduledDuration} />
            <KeyValueRow label="Team Cleaning Time" value={appointment.teamCleaningTime} />
            <KeyValueRow label="Technician Time" value={appointment.technicianTime} />
            <KeyValueRow label="Timesheet Notes" value={appointment.timesheetNotes} />
            <KeyValueRow label="GPS arrival time" value={appointment.gpsArrivalTime} />
            <KeyValueRow label="GPS departure time" value={appointment.gpsDepartureTime} />
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2">
              <Button variant="default" className="w-fit">
                Edit Timesheet Detail
              </Button>
              <Button variant="default" className="w-fit">
                Edit Customer Detail
              </Button>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="text-lg font-semibold">Customer</div>
            <div className="space-y-2">
              <KeyValueRow label="Name" value={appointment.customerName} />
              <KeyValueRow label="Email" value={appointment.customerEmail} />
              <KeyValueRow label="Phone" value={appointment.customerPhone} />
              <KeyValueRow label="Address" value={appointment.customerAddress} />
              <KeyValueRow label="Family Info" value={appointment.familyInfo} />
              <KeyValueRow label="Parking Access" value={appointment.parkingAccess} />
              <KeyValueRow label="Client notes from tech" value={appointment.clientNotesFromTech} />
              <KeyValueRow label="Special Instructions from Client" value={appointment.specialInstructionsFromClient} />
              <KeyValueRow label="Special Instructions from Admin" value={appointment.specialInstructionsFromAdmin} />
              <KeyValueRow label="Special request from client" value={appointment.specialRequestFromClient} />
              <Separator />
              <KeyValueRow label="Assigned Staff" value={appointment.assignedStaff} />
              <KeyValueRow label="Preferred Technician" value={appointment.preferredTechnician} />
            </div>
          </div>

          {hasCleaningMedia && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-lg font-semibold">Cleaning Media</div>

                {beforeImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Before Images</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {beforeImages.map((url, idx) => (
                        <a
                          key={`before-${idx}-${url}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border overflow-hidden block"
                        >
                          <img
                            src={url}
                            alt={`Before image ${idx + 1}`}
                            className="h-28 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {afterImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">After Images</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {afterImages.map((url, idx) => (
                        <a
                          key={`after-${idx}-${url}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border overflow-hidden block"
                        >
                          <img
                            src={url}
                            alt={`After image ${idx + 1}`}
                            className="h-28 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {videos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Videos</div>
                    <div className="space-y-2">
                      {videos.map((url, idx) => (
                        <div key={`video-${idx}-${url}`} className="rounded-md border overflow-hidden">
                          <video src={url} controls className="w-full max-h-56 bg-black" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!readOnly && (
          <div className="mt-auto p-4 border-t bg-muted/30">
            <div className="flex flex-wrap gap-2 justify-end">
            {/* Always Visible: Bill Client (unless already invoiced/paid/closed maybe? User said ALWAYS) */}
            {appointment.bookingStatus !== "paid" &&
              appointment.bookingStatus !== "closed" &&
              appointment.bookingStatus !== "cancelled" &&
              appointment.bookingStatus !== "rejected" && (
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => setIsBillingModalOpen(true)}
                  disabled={isLoading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bill client
                </Button>
              )}

            {canShowFeedbackButton && (
              <Button
                variant="outline"
                className="min-w-[120px]"
                onClick={() => setIsFeedbackSheetOpen(true)}
                disabled={isLoading}
              >
                Feedbak
              </Button>
            )}

            {/* Unconfirmed State */}
            {appointment.bookingStatus === "unconfirmed" && (
              <>
                <Button
                  variant="default"
                  className="min-w-[120px] bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusUpdate("confirmed")}
                  disabled={isLoading}
                >
                  {loadingAction === "confirmed" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Confirm
                </Button>
                <Button
                  variant="destructive"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={isLoading}
                >
                  {loadingAction === "rejected" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
              </>
            )}

            {/* Confirmed / Scheduled State */}
            {(appointment.bookingStatus === "confirmed" || appointment.bookingStatus === "scheduled") && (
              <>
                <Button
                  variant="secondary"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={isLoading}
                >
                  {loadingAction === "completed" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Complete
                </Button>
                <Button
                  variant="destructive"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("cancelled")}
                  disabled={isLoading}
                >
                  {loadingAction === "cancelled" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Cancel
                </Button>
              </>
            )}

            {/* Completed State */}
            {appointment.bookingStatus === "completed" && (
              <Button
                variant="outline"
                className="min-w-[120px]"
                onClick={() => handleStatusUpdate("confirmed")}
                disabled={isLoading}
              >
                {loadingAction === "confirmed" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Re-open
              </Button>
            )}

            {/* Cancelled State */}
            {(appointment.bookingStatus === "cancelled" || appointment.bookingStatus === "rejected") && (
              <Button
                variant="destructive"
                className="min-w-[120px]"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            )}

            {/* Invoice Sent State */}
            {appointment.bookingStatus === "invoice_sent" && (
              <>
                <Button
                  variant="default"
                  className="min-w-[120px] bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusUpdate("paid")}
                  disabled={isLoading}
                >
                  {loadingAction === "paid" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
                  Payment Confirmed
                </Button>
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => handleStatusUpdate("confirmed")}
                  disabled={isLoading}
                >
                  {loadingAction === "confirmed" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Undo Invoice
                </Button>
              </>
            )}

            {/* Paid State */}
            {appointment.bookingStatus === "paid" && (
              <>
                <Button
                  variant="default"
                  className="min-w-[120px] bg-gray-600 hover:bg-gray-700"
                  onClick={() => handleStatusUpdate("closed")}
                  disabled={isLoading}
                >
                  {loadingAction === "closed" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                  Close Booking
                </Button>
              </>
            )}

            {/* Closed State */}
            {appointment.bookingStatus === "closed" && (
              <Button
                variant="destructive"
                className="min-w-[120px]"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            )}

            </div>
          </div>
        )}
        {readOnly && footerContent && (
          <div className="mt-auto p-4 border-t bg-muted/30">
            <div className="flex flex-wrap gap-2 justify-end">{footerContent}</div>
          </div>
        )}
      </SheetContent>

      {!readOnly && editBookingOpen && (
        <EditBookingDetailsDialog
          open={editBookingOpen}
          onOpenChange={setEditBookingOpen}
          appointment={appointment}
        />
      )}

      {!readOnly && isBillingModalOpen && (
        <BillClientModal
          open={isBillingModalOpen}
          onOpenChange={setIsBillingModalOpen}
          bookingId={appointment.bookingId as string}
        />
      )}

      {!readOnly && (
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => !isLoading && setIsDeleteDialogOpen(open)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete booking</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this booking? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  handleDelete();
                }}
                disabled={isLoading}
              >
                {loadingAction === "delete" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!readOnly && (
        <Sheet open={isFeedbackSheetOpen} onOpenChange={setIsFeedbackSheetOpen}>
          <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
            <SheetHeader className="p-4 border-b gap-0">
              <SheetTitle>Add New Review</SheetTitle>
              <SheetDescription>Fill in review details and save.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 cursor-pointer ${(newReview.rating || 0) >= star ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        onClick={() => setNewReview((prev) => ({ ...prev, rating: star }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Review Title</Label>
                  <Input
                    placeholder="e.g. 100% Satisfied"
                    value={newReview.title}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Review Text</Label>
                  <Textarea
                    placeholder="Enter review content..."
                    value={newReview.text}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, text: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reviewer Name</Label>
                  <Input value={newReview.reviewer} readOnly />
                </div>
              </div>
            </div>
            <SheetFooter className="p-4 border-t bg-muted/30 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsFeedbackSheetOpen(false)}
                disabled={savingFeedback}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFeedback}
                disabled={savingFeedback || !newReview.title.trim() || !newReview.text.trim()}
              >
                {savingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {savingFeedback ? "Saving..." : "Save Review"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </Sheet>
  );
}
