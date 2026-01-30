"use client";

import { useState } from "react";
import { Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface Review {
    _id?: string;
    title: string;
    rating: number;
    text: string;
    reviewer: string;
    createdAt?: string;
}

interface UserReviewsProps {
    reviews: Review[];
    onSave: (review: Review) => void;
}

export function UserReviews({ reviews, onSave }: UserReviewsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReview, setNewReview] = useState<Partial<Review>>({
      rating: 5,
      title: "",
      text: "",
      reviewer: "Admin"
  });

  const handleSave = () => {
      if (!newReview.title || !newReview.text) return;
      
      onSave({
          title: newReview.title,
          rating: newReview.rating || 5,
          text: newReview.text,
          reviewer: newReview.reviewer || "Admin",
          createdAt: new Date().toISOString()
      });
      setIsDialogOpen(false);
      setNewReview({ rating: 5, title: "", text: "", reviewer: "Admin" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h3 className="text-lg font-medium">Customer Reviews</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Add Review
                  </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Add New Review</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                      <div className="space-y-2">
                          <Label>Rating</Label>
                          <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                      key={star}
                                      className={`w-6 h-6 cursor-pointer ${(newReview.rating || 0) >= star ? "fill-primary text-primary" : "text-muted-foreground"}`}
                                      onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                  />
                              ))}
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label>Review Title</Label>
                          <Input 
                              placeholder="e.g. 100% Satisfied" 
                              value={newReview.title}
                              onChange={e => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>Review Text</Label>
                          <Textarea 
                              placeholder="Enter review content..." 
                              value={newReview.text}
                              onChange={e => setNewReview(prev => ({ ...prev, text: e.target.value }))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>Reviewer Name</Label>
                          <Input 
                               placeholder="Customer Name"
                               value={newReview.reviewer}
                               onChange={e => setNewReview(prev => ({ ...prev, reviewer: e.target.value }))}
                          />
                      </div>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSave}>Save Review</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </div>

      {reviews.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
              No reviews yet. Add one to get started.
          </div>
      )}

      {reviews.map((review, index) => (
        <div key={review._id || index} className="border rounded-md p-4 space-y-2 bg-background">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{review.title} -</span>
            <div className="flex">
               {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "fill-none text-primary"}`}
                />
              ))}
            </div>
          </div>
          
          <p className="text-sm text-foreground">
            {review.text}
          </p>
          
          <div className="text-sm text-muted-foreground">
            — Review by <span className="italic">{review.reviewer}</span>
          </div>
          
          {review.createdAt && (
            <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                Created {new Date(review.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
