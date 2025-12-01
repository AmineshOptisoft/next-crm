import { Schema, model, models, Types } from "mongoose";

const EmployeeSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    position: { type: String },
    department: { type: String },
    salary: { type: Number },
    status: {
      type: String,
      enum: ["active", "on-leave", "terminated"],
      default: "active",
    },
    hireDate: { type: Date },
  },
  { timestamps: true }
);

export const Employee = models.Employee || model("Employee", EmployeeSchema);
