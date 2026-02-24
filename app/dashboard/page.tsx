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

  const companyObjectId = new Types.ObjectId(companyId);

  // Group queries to run in parallel
  const [
    totalEmployees,
    employeesLastMonth,
    leavesCount,
    leavesLastMonth,
    productivityData,
    recentEmployees
  ] = await Promise.all([
    // Total employees
    User.countDocuments({
      companyId: companyObjectId,
      role: "employee",
      employeeStatus: "active",
    }),
    // Employees last month
    User.countDocuments({
      companyId: companyObjectId,
      role: "employee",
      employeeStatus: "active",
      createdAt: { $lt: currentMonthStart },
    }),
    // Leaves count
    User.countDocuments({
      companyId: companyObjectId,
      role: "employee",
      employeeStatus: "on-leave",
    }),
    // Leaves last month
    User.countDocuments({
      companyId: companyObjectId,
      role: "employee",
      employeeStatus: "on-leave",
      updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    }),
    // Productivity aggregation
    Task.aggregate([
      {
        $match: {
          companyId: companyObjectId,
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
    ]),
    // Recent employees
    User.find({
      companyId: companyObjectId,
      role: "employee",
      employeeStatus: "active",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  const employeeGrowth =
    employeesLastMonth > 0
      ? ((totalEmployees - employeesLastMonth) / employeesLastMonth) * 100
      : 0;

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="">
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto pb-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <StatsCards
              employeeStats={stats.employees}
              leavesStats={stats.leaves}
            />

            <div className="grid gap-4 grid-cols-1 md:grid-cols-7">
              <div className="col-span-1 md:col-span-4">
                <ProductivityChart data={stats.productivity} />
              </div>
              <div className="col-span-1 md:col-span-3">
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
