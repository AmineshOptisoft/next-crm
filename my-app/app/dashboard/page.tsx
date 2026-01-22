import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Task } from "../models/Task";
import { Deal } from "../models/Deal";
import { User } from "../models/User";
import { Types } from "mongoose";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";
import { EmployeeList } from "@/components/dashboard/employee-list";

async function getStats(companyId: string) {
  await connectDB();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const totalEmployees = await User.countDocuments({
    companyId: new Types.ObjectId(companyId),
    role: "employee",
    employeeStatus: "active",
  });

  const employeesLastMonth = await User.countDocuments({
    companyId: new Types.ObjectId(companyId),
    role: "employee",
    employeeStatus: "active",
    createdAt: { $lt: currentMonthStart },
  });

  const employeeGrowth =
    employeesLastMonth > 0
      ? ((totalEmployees - employeesLastMonth) / employeesLastMonth) * 100
      : 0;

  const leavesCount = await User.countDocuments({
    companyId: new Types.ObjectId(companyId),
    role: "employee",
    employeeStatus: "on-leave",
  });

  const leavesLastMonth = await User.countDocuments({
    companyId: new Types.ObjectId(companyId),
    role: "employee",
    employeeStatus: "on-leave",
    updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
  });

  const productivityData = await Task.aggregate([
    {
      $match: {
        companyId: new Types.ObjectId(companyId),
        status: "completed",
        createdAt: {
          $gte: new Date(now.getFullYear(), 0, 1),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const productivity = months.map((month, index) => {
    const data = productivityData.find((d: any) => d._id === index + 1);
    return {
      month,
      value: data ? data.count * 1000 : Math.floor(Math.random() * 5000),
    };
  });

  const recentEmployees = await User.find({
    companyId: new Types.ObjectId(companyId),
    role: "employee",
    employeeStatus: "active",
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    employees: {
      total: totalEmployees,
      growth: employeeGrowth,
      recent: recentEmployees.map((e: any) => ({
        _id: e._id.toString(),
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        salary: e.salary,
      })),
    },
    leaves: {
      total: leavesCount,
      lastMonth: leavesLastMonth,
    },
    productivity,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!user.companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No Company Associated</h1>
          <p className="text-muted-foreground">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const stats = await getStats(user.companyId);

  const fullName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.email;

  return (
    <div className="flex flex-col space-y-6">
      {/* Top header with user info and search */}

      <div className="flex items-center justify-between px-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="px-6">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <StatsCards
              employeeStats={stats.employees}
              leavesStats={stats.leaves}
            />

            <div className="grid gap-4 md:grid-cols-7">
              <div className="md:col-span-4">
                <ProductivityChart data={stats.productivity} />
              </div>
              <div className="md:col-span-3">
                <EmployeeList employees={stats.employees.recent} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Analytics view coming soon
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Reports view coming soon
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Notifications view coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
