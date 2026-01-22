import { Schema, model, models, Types } from "mongoose";

const EmailCampaignSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true }, // HTML content
    recipients: [{ type: Types.ObjectId, ref: "Contact" }],
    segmentFilter: { type: Object }, // Filter criteria for dynamic segments
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "paused"],
      default: "draft",
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

EmailCampaignSchema.index({ ownerId: 1, status: 1 });

export const EmailCampaign =
  models.EmailCampaign || model("EmailCampaign", EmailCampaignSchema);
