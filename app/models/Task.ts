import { Schema, model, models, Types } from "mongoose";

const TaskSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: Types.ObjectId, ref: "User" },
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

TaskSchema.index({ companyId: 1, status: 1 });
TaskSchema.index({ ownerId: 1 });

if (models && models.Task) {
  delete (models as any).Task;
}

export const Task = model("Task", TaskSchema);
