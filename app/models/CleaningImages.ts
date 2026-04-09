import mongoose, { Document, Schema, model, models } from "mongoose";

export interface ICleaningImages extends Document {
  uploadeBy: mongoose.Types.ObjectId;
  images: {
    before: string[];
    after: string[];
  };
  video: string[];
  bookingId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CleaningImagesSchema = new Schema<ICleaningImages>(
  {
    uploadeBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    images: {
      before: {
        type: [String],
        default: [],
      },
      after: {
        type: [String],
        default: [],
      },
    },
    video: {
      type: [String],
      default: [],
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
  },
  { timestamps: true }
);

CleaningImagesSchema.index({ bookingId: 1 });
CleaningImagesSchema.index({ uploadeBy: 1, createdAt: -1 });

export const CleaningImages =
  (models.CleaningImages as mongoose.Model<ICleaningImages>) ||
  model<ICleaningImages>("CleaningImages", CleaningImagesSchema);
