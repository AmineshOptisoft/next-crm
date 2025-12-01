import { Schema, model, models, Types } from "mongoose";

const TaskSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: Types.ObjectId, ref: "Employee" },
    status: {
      type: String,
      enum: ["todo", "in-progress", "completed", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

export const Task = models.Task || model("Task", TaskSchema);
