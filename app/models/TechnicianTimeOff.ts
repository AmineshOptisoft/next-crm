import { Schema, model, models, Types } from "mongoose";

const TechnicianTimeOffSchema = new Schema(
  {
    technicianId: { type: Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // Keeping strict string format as requested/used in mock
    endDate: { type: Date, required: true },
    endTime: { type: String, required: true },
    reason: { 
      type: String, 
      required: true,
      enum: ["Sick Time", "Unrequested Absence", "Vacation Time", "Unpaid Time Off"] // Updated enums based on user request
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED", // Defaulting to APPROVED as per screen mock, or PENDING if workflow requires
    },
    notes: { type: String },
    createdBy: { type: Types.ObjectId, ref: "User" }, // Who created this request
  },
  { timestamps: true }
);

// Indexes
TechnicianTimeOffSchema.index({ technicianId: 1, startDate: 1 });
TechnicianTimeOffSchema.index({ status: 1 });

if (models && models.TechnicianTimeOff) {
  delete (models as any).TechnicianTimeOff;
}

export const TechnicianTimeOff = model("TechnicianTimeOff", TechnicianTimeOffSchema);
