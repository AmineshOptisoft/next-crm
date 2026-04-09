"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

type MeResponse = {
  user?: {
    id?: string;
    role?: string;
  } | null;
};

type ReviewItem = {
  _id: string;
  title: string;
  rating: number;
  reviewer: string;
  technicianName: string;
  text?: string;
  createdAt?: string;
};

export default function ReviewsPage() {
  const { data: meData } = useSWR<MeResponse>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
  });

  const isTechnicianRole =
    meData?.user?.role === "company_user" || meData?.user?.role === "employee";
  const isAdminRole =
    meData?.user?.role === "super_admin" || meData?.user?.role === "company_admin";
  const reviewsUrl =
    isTechnicianRole && meData?.user?.id
      ? `/api/reviews?technicianId=${meData.user.id}`
      : isAdminRole
        ? "/api/reviews?all=1"
        : "/api/reviews?reviewedBy=client";

  const { data: reviews, isLoading } = useSWR<ReviewItem[]>(reviewsUrl, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isTechnicianRole ? "My Reviews" : "Technician Reviews"}
        </h1>
        <p className="text-muted-foreground">
          {isTechnicianRole
            ? "All reviews submitted for your technician profile."
            : isAdminRole
              ? "All reviews submitted for technicians by both admins and clients."
              : "All recent reviews submitted by clients for technicians."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading reviews...
            </div>
          ) : !Array.isArray(reviews) || reviews.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground text-center">
              No reviews found.
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className="rounded-md border p-4">
                <div className="text-sm font-medium">
                  {review.reviewer} reviewed {review.technicianName}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          review.rating >= star ? "fill-primary text-primary" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">({review.rating}/5)</span>
                </div>
                <div className="text-sm text-foreground mt-2">{review.title}</div>
                {review.text ? (
                  <div className="text-xs text-muted-foreground mt-1">{review.text}</div>
                ) : null}
                <div className="text-[11px] text-muted-foreground mt-2">
                  {review.createdAt ? new Date(review.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
