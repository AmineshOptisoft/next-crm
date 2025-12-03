import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Deal } from "@/app/models/Deal";
import { Task } from "@/app/models/Task";
import { Contact } from "@/app/models/Contact";
import { Invoice } from "@/app/models/Invoice";
import { Employee } from "@/app/models/Employee";
import { Activity } from "@/app/models/Activity";
import { getCurrentUser } from "@/lib/auth";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get("type") || "overview";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  await connectDB();

  const dateFilter: any = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  try {
    let reportData: any = {};

    switch (reportType) {
      case "overview":
        reportData = await getOverviewReport(user.userId, dateFilter);
        break;
      case "sales":
        reportData = await getSalesReport(user.userId, dateFilter);
        break;
      case "revenue":
        reportData = await getRevenueReport(user.userId, dateFilter);
        break;
      case "employee_performance":
        reportData = await getEmployeePerformanceReport(
          user.userId,
          dateFilter
        );
        break;
      case "pipeline":
        reportData = await getPipelineReport(user.userId, dateFilter);
        break;
      case "activity":
        reportData = await getActivityReport(user.userId, dateFilter);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      type: reportType,
      dateRange: { startDate, endDate },
      generatedAt: new Date(),
      data: reportData,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

async function getOverviewReport(userId: string, dateFilter: any) {
  const filter: any = { ownerId: userId };
  if (Object.keys(dateFilter).length > 0) {
    filter.createdAt = dateFilter;
  }

  const [
    totalDeals,
    wonDeals,
    totalRevenue,
    totalContacts,
    totalTasks,
    completedTasks,
    totalEmployees,
    totalInvoices,
    paidInvoices,
  ] = await Promise.all([
    Deal.countDocuments({ ownerId: userId }),
    Deal.countDocuments({ ownerId: userId, stage: "won" }),
    Deal.aggregate([
      { $match: { ownerId: new Types.ObjectId(userId), stage: "won" } },
      { $group: { _id: null, total: { $sum: "$value" } } },
    ]),
    Contact.countDocuments(filter),
    Task.countDocuments(filter),
    Task.countDocuments({ ...filter, status: "completed" }),
    Employee.countDocuments({ ownerId: userId, status: "active" }),
    Invoice.countDocuments(filter),
    Invoice.countDocuments({ ...filter, status: "paid" }),
  ]);

  return {
    deals: {
      total: totalDeals,
      won: wonDeals,
      winRate: totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(2) : 0,
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
    },
    contacts: {
      total: totalContacts,
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      completionRate:
        totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0,
    },
    employees: {
      total: totalEmployees,
    },
    invoices: {
      total: totalInvoices,
      paid: paidInvoices,
      paymentRate:
        totalInvoices > 0
          ? ((paidInvoices / totalInvoices) * 100).toFixed(2)
          : 0,
    },
  };
}

async function getSalesReport(userId: string, dateFilter: any) {
  const matchFilter: any = { ownerId: new Types.ObjectId(userId) };
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.createdAt = dateFilter;
  }

  const dealsByStage = await Deal.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        totalValue: { $sum: "$value" },
      },
    },
  ]);

  const dealsByMonth = await Deal.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
        totalValue: { $sum: "$value" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const topDeals = await Deal.find(matchFilter)
    .sort({ value: -1 })
    .limit(10)
    .populate("contactId", "name company")
    .lean();

  return {
    byStage: dealsByStage,
    byMonth: dealsByMonth,
    topDeals,
  };
}

async function getRevenueReport(userId: string, dateFilter: any) {
  const matchFilter: any = { ownerId: new Types.ObjectId(userId) };
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.createdAt = dateFilter;
  }

  const invoiceRevenue = await Invoice.aggregate([
    { $match: { ...matchFilter, status: "paid" } },
    {
      $group: {
        _id: {
          year: { $year: "$paidDate" },
          month: { $month: "$paidDate" },
        },
        revenue: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const dealRevenue = await Deal.aggregate([
    { $match: { ...matchFilter, stage: "won" } },
    {
      $group: {
        _id: {
          year: { $year: "$closeDate" },
          month: { $month: "$closeDate" },
        },
        revenue: { $sum: "$value" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const outstandingInvoices = await Invoice.aggregate([
    {
      $match: {
        ownerId: new Types.ObjectId(userId),
        status: { $in: ["sent", "overdue"] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    invoiceRevenue,
    dealRevenue,
    outstanding: outstandingInvoices[0] || { total: 0, count: 0 },
  };
}

async function getEmployeePerformanceReport(
  userId: string,
  dateFilter: any
) {
  const employees = await Employee.find({
    ownerId: userId,
    status: "active",
  }).lean();

  const performanceData = await Promise.all(
    employees.map(async (emp) => {
      const taskFilter: any = { ownerId: userId, assignedTo: emp._id };
      if (Object.keys(dateFilter).length > 0) {
        taskFilter.createdAt = dateFilter;
      }

      const [totalTasks, completedTasks, totalActivities] = await Promise.all([
        Task.countDocuments(taskFilter),
        Task.countDocuments({ ...taskFilter, status: "completed" }),
        Activity.countDocuments({
          ownerId: userId,
          assignedTo: emp._id,
          ...(Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter }
            : {}),
        }),
      ]);

      return {
        employee: {
          id: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          position: emp.position,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate:
            totalTasks > 0
              ? ((completedTasks / totalTasks) * 100).toFixed(2)
              : 0,
        },
        activities: totalActivities,
      };
    })
  );

  return performanceData;
}

async function getPipelineReport(userId: string, dateFilter: any) {
  const matchFilter: any = { ownerId: new Types.ObjectId(userId) };
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.createdAt = dateFilter;
  }

  const pipelineData = await Deal.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        totalValue: { $sum: "$value" },
        avgValue: { $avg: "$value" },
      },
    },
  ]);

  const conversionRates = await Deal.aggregate([
    { $match: { ownerId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    pipeline: pipelineData,
    conversionRates,
  };
}

async function getActivityReport(userId: string, dateFilter: any) {
  const matchFilter: any = { ownerId: new Types.ObjectId(userId) };
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.createdAt = dateFilter;
  }

  const activitiesByType = await Activity.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  const activitiesByStatus = await Activity.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const activitiesByMonth = await Activity.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return {
    byType: activitiesByType,
    byStatus: activitiesByStatus,
    byMonth: activitiesByMonth,
  };
}
