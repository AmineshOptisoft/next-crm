import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Task } from "../models/Task";
import { Deal } from "../models/Deal";
import { User } from "../models/User";
import { Booking } from "../models/Booking";
import { TechnicianTimeOff } from "../models/TechnicianTimeOff";
import { Types } from "mongoose";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";
import { EmployeeList } from "@/components/dashboard/employee-list";
import { UpcomingBookings } from "@/components/dashboard/upcoming-bookings";
import { TodaysBookings } from "@/components/dashboard/todays-bookings";
import { TechnicianStatsCards } from "../../components/dashboard/technician-stats-cards";
import { CompletedBookings } from "../../components/dashboard/completed-bookings";

function mapBookingForDetails(b: any) {
  return {
    _id: b._id.toString(),
    orderId: b.orderId,
    startDateTime: b.startDateTime,
    endDateTime: b.endDateTime,
    status: b.status,
    serviceName: b.serviceId?.name,
    notes: b.notes,
    units: b.subServices?.length ?? 0,
    addons:
      Array.isArray(b.addons) && b.addons.length > 0
        ? b.addons
            .map((addon: any) => `${addon.quantity ?? 1}x ${(addon.serviceId as any)?.name ?? "Addon"}`)
            .join(", ")
        : undefined,
    bookingPrice: b.pricing?.totalAmount,
    bookingDiscountPrice: b.pricing?.finalAmount,
    bookingDiscount: b.pricing?.discount,
    billedHours: b.pricing?.billedHours,
    customerName: `${b.contactId?.firstName ?? ""} ${b.contactId?.lastName ?? ""}`.trim() || "-",
    customerEmail: b.contactId?.email,
    customerPhone: b.contactId?.phoneNumber,
    customerAddress:
      b.shippingAddress?.street && b.shippingAddress?.city
        ? `${b.shippingAddress.street}, ${b.shippingAddress.city}, ${b.shippingAddress.state ?? ""} ${b.shippingAddress.zipCode ?? ""}`.trim()
        : b.contactId?.address,
    assignedStaff: `${b.technicianId?.firstName ?? ""} ${b.technicianId?.lastName ?? ""}`.trim() || "-",
    preferredTechnician: `${b.technicianId?.firstName ?? ""} ${b.technicianId?.lastName ?? ""}`.trim() || "-",
    teamCleaningTime: b.timesheet?.cleaningTime,
    technicianTime: b.timesheet?.technicianTime,
    timesheetNotes: b.timesheet?.notes,
    gpsArrivalTime: b.timesheet?.arrivalTime,
    gpsDepartureTime: b.timesheet?.departureTime,
  };
}

async function getCompanyStats(companyId: string) {
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
    employeesAddedLastMonth,
    leavesThisMonth,
    productivityData,
    recentEmployees,
    upcomingBookings,
  ] = await Promise.all([
    // Total employees (company users)
    User.countDocuments({
      companyId: companyObjectId,
      role: "company_user",
      isActive: true,
    }),
    // Employees at start of current month (company users created before this month)
    User.countDocuments({
      companyId: companyObjectId,
      role: "company_user",
      isActive: true,
      createdAt: { $lt: currentMonthStart },
    }),
    // Total time off records (approved) overall
    TechnicianTimeOff.countDocuments({
      technicianId: { $exists: true },
      status: "APPROVED",
    }),
    // Time off records approved last month
    TechnicianTimeOff.countDocuments({
      technicianId: { $exists: true },
      status: "APPROVED",
      startDate: { $gte: lastMonthStart, $lte: lastMonthEnd },
    }),
    // Employees added last month (company users created in last month window)
    User.countDocuments({
      companyId: companyObjectId,
      role: "company_user",
      isActive: true,
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    }),
    // Time off records (approved) in current month
    TechnicianTimeOff.countDocuments({
      technicianId: { $exists: true },
      status: "APPROVED",
      startDate: { $gte: currentMonthStart },
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
    // Recent employees / team members (include all active staff roles)
    User.find({
      companyId: companyObjectId,
      role: { $in: ["company_admin", "company_user", "employee"] },
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    // Upcoming bookings (today and future)
    Booking.find({
      companyId: companyObjectId,
      startDateTime: { $gte: now },
    })
      .populate("contactId", "firstName lastName email phoneNumber address city state zipCode")
      .populate("technicianId", "firstName lastName")
      .populate("serviceId", "name")
      .populate("addons.serviceId", "name")
      .sort({ startDateTime: 1 })
      .limit(10)
      .lean(),
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
      addedLastMonth: employeesAddedLastMonth,
      recent: recentEmployees.map((e: any) => ({
        _id: e._id.toString(),
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        salary: e.salary,
        role: e.role,
      })),
    },
    leaves: {
      total: leavesCount,
      lastMonth: leavesLastMonth,
      thisMonth: leavesThisMonth,
    },
    productivity,
    bookings: upcomingBookings.map(mapBookingForDetails),
  };
}

async function getTechnicianStats(companyId: string, technicianId: string) {
  await connectDB();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const companyObjectId = new Types.ObjectId(companyId);
  const technicianObjectId = new Types.ObjectId(technicianId);

  const [
    totalBookings,
    totalCompletedBookings,
    completedBookings,
    upcomingBookings,
    todayBookings,
  ] =
    await Promise.all([
      Booking.countDocuments({
        companyId: companyObjectId,
        technicianId: technicianObjectId,
      }),
      Booking.countDocuments({
        companyId: companyObjectId,
        technicianId: technicianObjectId,
        status: "completed",
      }),
      Booking.find({
        companyId: companyObjectId,
        technicianId: technicianObjectId,
        status: "completed",
      })
        .populate("contactId", "firstName lastName email phoneNumber address city state zipCode")
        .populate("technicianId", "firstName lastName")
        .populate("serviceId", "name")
        .populate("addons.serviceId", "name")
        .sort({ endDateTime: -1 })
        .limit(10)
        .lean(),
      Booking.find({
        companyId: companyObjectId,
        technicianId: technicianObjectId,
        startDateTime: { $gte: now },
      })
        .populate("contactId", "firstName lastName email phoneNumber address city state zipCode")
        .populate("technicianId", "firstName lastName")
        .populate("serviceId", "name")
        .populate("addons.serviceId", "name")
        .sort({ startDateTime: 1 })
        .limit(10)
        .lean(),
      Booking.find({
        companyId: companyObjectId,
        technicianId: technicianObjectId,
        startDateTime: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate("contactId", "firstName lastName email phoneNumber address city state zipCode")
        .populate("technicianId", "firstName lastName")
        .populate("serviceId", "name")
        .populate("addons.serviceId", "name")
        .sort({ startDateTime: 1 })
        .lean(),
    ]);

  return {
    technician: {
      totalBookings,
      totalCompletedBookings,
    },
    completedBookings: completedBookings.map(mapBookingForDetails),
    bookings: upcomingBookings.map(mapBookingForDetails),
    todayBookings: todayBookings.map(mapBookingForDetails),
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

  const isTechnician = user.role === "company_user";
  const companyStats: Awaited<ReturnType<typeof getCompanyStats>> | null =
    isTechnician ? null : await getCompanyStats(user.companyId);
  const technicianStats: Awaited<ReturnType<typeof getTechnicianStats>> | null =
    isTechnician ? await getTechnicianStats(user.companyId, user.userId) : null;

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
          {isTechnician && technicianStats && technicianStats.todayBookings.length > 0 ? (
        <TodaysBookings bookings={technicianStats.todayBookings} />
      ) : null}

          <TabsContent value="overview" className="space-y-4">
            {isTechnician && technicianStats ? (
              <TechnicianStatsCards
                totalBookings={technicianStats.technician.totalBookings}
                totalCompletedBookings={technicianStats.technician.totalCompletedBookings}
              />
            ) : companyStats ? (
              <StatsCards
                employeeStats={companyStats.employees}
                leavesStats={companyStats.leaves}
              />
            ) : null}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
              <div className="col-span-1 md:col-span-2">
                {isTechnician && technicianStats ? (
                  <CompletedBookings
                    bookings={technicianStats.completedBookings}
                    readOnly
                    manageFromDashboard
                  />
                ) : companyStats ? (
                  <EmployeeList employees={companyStats.employees.recent} />
                ) : null}
              </div>
              <div className="col-span-1 md:col-span-2">
                <UpcomingBookings
                  bookings={
                    isTechnician && technicianStats
                      ? technicianStats.bookings
                      : companyStats
                      ? companyStats.bookings
                      : []
                  }
                  readOnly={isTechnician}
                  manageFromDashboard={isTechnician}
                />
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
