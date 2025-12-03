import { Schema, model, models, Types } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "task_due",
        "task_assigned",
        "deal_won",
        "deal_lost",
        "meeting_reminder",
        "invoice_overdue",
        "new_contact",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedTo: {
      model: { type: String }, // Task, Deal, Contact, etc.
      id: { type: Types.ObjectId },
    },
    link: { type: String }, // URL to navigate to
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification =
  models.Notification || model("Notification", NotificationSchema);
