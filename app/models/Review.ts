import mongoose, { Document, Schema, model, models } from "mongoose";

export interface IReview extends Document {
  reviewNote: string;
  reviewerId: mongoose.Types.ObjectId;
  technicianId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  starRating: number;
  reviewTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    reviewNote: {
      type: String,
      required: true,
      trim: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    starRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewTitle: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ technicianId: 1, createdAt: -1 });
ReviewSchema.index({ bookingId: 1 });
ReviewSchema.index({ reviewerId: 1 });

const existingReviewModel = models.Review as mongoose.Model<IReview> | undefined;

if (existingReviewModel) {
  const bookingPath: any = existingReviewModel.schema.path("bookingId");
  if (bookingPath) {
    // Keep dev/HMR safe: old compiled schemas may still have bookingId required.
    bookingPath.options.required = false;
    if (Array.isArray(bookingPath.validators)) {
      bookingPath.validators = bookingPath.validators.filter(
        (validator: any) => validator?.type !== "required" && validator?.kind !== "required"
      );
    }
  }
}

export const Review = existingReviewModel || model<IReview>("Review", ReviewSchema);
