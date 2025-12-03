import { Schema, model, models, Types } from "mongoose";

const AttendeeSchema = new Schema({
  contactId: { type: Types.ObjectId, ref: "Contact" },
  employeeId: { type: Types.ObjectId, ref: "Employee" },
  email: { type: String },
  name: { type: String },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "tentative"],
    default: "pending",
  },
});

const MeetingSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    meetingLink: { type: String }, // For virtual meetings
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    attendees: [AttendeeSchema],
    dealId: { type: Types.ObjectId, ref: "Deal" },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    reminder: {
      enabled: { type: Boolean, default: true },
      minutesBefore: { type: Number, default: 15 },
    },
    notes: { type: String },
    outcome: { type: String },
  },
  { timestamps: true }
);

MeetingSchema.index({ companyId: 1, startTime: 1 });
MeetingSchema.index({ ownerId: 1, startTime: 1 });
MeetingSchema.index({ "attendees.employeeId": 1, startTime: 1 });

export const Meeting = models.Meeting || model("Meeting", MeetingSchema);
