import { connectDB } from "./db";
import { Notification } from "@/app/models/Notification";
import { Types } from "mongoose";

interface CreateNotificationParams {
  userId: string;
  type:
    | "task_due"
    | "task_assigned"
    | "deal_won"
    | "deal_lost"
    | "meeting_reminder"
    | "invoice_overdue"
    | "new_contact"
    | "system";
  title: string;
  message: string;
  relatedTo?: {
    model: string;
    id: string;
  };
  link?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    await connectDB();

    const notification = await Notification.create({
      userId: new Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      message: params.message,
      relatedTo: params.relatedTo
        ? {
            model: params.relatedTo.model,
            id: new Types.ObjectId(params.relatedTo.id),
          }
        : undefined,
      link: params.link,
      priority: params.priority || "medium",
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Helper function to check for overdue tasks and create notifications
export async function checkOverdueTasks() {
  try {
    await connectDB();
    const { Task } = await import("@/app/models/Task");

    const now = new Date();
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $ne: "completed" },
    })
      .populate("ownerId")
      .lean();

    for (const task of overdueTasks) {
      await createNotification({
        userId: task.ownerId.toString(),
        type: "task_due",
        title: "Task Overdue",
        message: `Task "${task.title}" is overdue`,
        relatedTo: {
          model: "Task",
          id: task._id.toString(),
        },
        link: `/dashboard/tasks`,
        priority: "high",
      });
    }
  } catch (error) {
    console.error("Error checking overdue tasks:", error);
  }
}

// Helper function to check for upcoming meetings and create reminders
export async function checkUpcomingMeetings() {
  try {
    await connectDB();
    const { Meeting } = await import("@/app/models/Meeting");

    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

    const upcomingMeetings = await Meeting.find({
      startTime: { $gte: now, $lte: reminderWindow },
      status: "scheduled",
      "reminder.enabled": true,
    })
      .populate("ownerId")
      .lean();

    for (const meeting of upcomingMeetings) {
      await createNotification({
        userId: meeting.ownerId.toString(),
        type: "meeting_reminder",
        title: "Upcoming Meeting",
        message: `Meeting "${meeting.title}" starts in ${meeting.reminder.minutesBefore} minutes`,
        relatedTo: {
          model: "Meeting",
          id: meeting._id.toString(),
        },
        link: `/dashboard/meetings`,
        priority: "high",
      });
    }
  } catch (error) {
    console.error("Error checking upcoming meetings:", error);
  }
}

// Helper function to check for overdue invoices
export async function checkOverdueInvoices() {
  try {
    await connectDB();
    const { Invoice } = await import("@/app/models/Invoice");

    const now = new Date();
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: now },
      status: "sent",
    })
      .populate("ownerId")
      .lean();

    for (const invoice of overdueInvoices) {
      // Update status to overdue
      await Invoice.findByIdAndUpdate(invoice._id, { status: "overdue" });

      await createNotification({
        userId: invoice.ownerId.toString(),
        type: "invoice_overdue",
        title: "Invoice Overdue",
        message: `Invoice ${invoice.invoiceNumber} is overdue`,
        relatedTo: {
          model: "Invoice",
          id: invoice._id.toString(),
        },
        link: `/dashboard/invoices`,
        priority: "urgent",
      });
    }
  } catch (error) {
    console.error("Error checking overdue invoices:", error);
  }
}
