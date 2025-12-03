"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, TrendingUp, DollarSign, Users, Target, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  type: string;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  generatedAt: string;
  data: any;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function AnalyticsPage() {
  const [reportType, setReportType] = useState("overview");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [reportType]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate }),
      });

      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = () => {
    fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const renderOverviewReport = () => {
    if (!analyticsData?.data) return null;
    const { deals, revenue, contacts, tasks, employees, invoices } = analyticsData.data;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deals.total}</div>
              <p className="text-xs text-muted-foreground">
                {deals.won} won • {deals.winRate}% win rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.total)}</div>
              <p className="text-xs text-muted-foreground">
                From deals and invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contacts.total}</div>
              <p className="text-xs text-muted-foreground">
                Active contacts in CRM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {tasks.completed} of {tasks.total} tasks completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.total}</div>
              <p className="text-xs text-muted-foreground">
                Team members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoice Payment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.paymentRate}%</div>
              <p className="text-xs text-muted-foreground">
                {invoices.paid} of {invoices.total} invoices paid
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSalesReport = () => {
    if (!analyticsData?.data) return null;
    const { byStage, byMonth } = analyticsData.data;

    const stageData = byStage.map((item: any) => ({
      name: item._id,
      count: item.count,
      value: item.totalValue,
    }));

    const monthData = byMonth.map((item: any) => ({
      name: `${item._id.month}/${item._id.year}`,
      deals: item.count,
      value: item.totalValue,
    }));

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Deals by Stage</CardTitle>
              <CardDescription>Distribution of deals across pipeline stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stageData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deal Value by Stage</CardTitle>
              <CardDescription>Total value of deals in each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deals Over Time</CardTitle>
            <CardDescription>Monthly deal count and value trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="deals"
                  stroke="#8884d8"
                  name="Deal Count"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="value"
                  stroke="#82ca9d"
                  name="Total Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRevenueReport = () => {
    if (!analyticsData?.data) return null;
    const { invoiceRevenue, dealRevenue, outstanding } = analyticsData.data;

    const invoiceData = invoiceRevenue.map((item: any) => ({
      name: `${item._id.month}/${item._id.year}`,
      revenue: item.revenue,
      count: item.count,
    }));

    const dealData = dealRevenue.map((item: any) => ({
      name: `${item._id.month}/${item._id.year}`,
      revenue: item.revenue,
      count: item.count,
    }));

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>Unpaid invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(outstanding.total)}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {outstanding.count} invoices pending payment
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Revenue Over Time</CardTitle>
            <CardDescription>Monthly paid invoice revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={invoiceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deal Revenue Over Time</CardTitle>
            <CardDescription>Monthly won deal revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={dealData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderEmployeePerformanceReport = () => {
    if (!analyticsData?.data) return null;
    const performanceData = analyticsData.data;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
            <CardDescription>Task completion and activity metrics by employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.map((emp: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{emp.employee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {emp.employee.position || "No position"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{emp.tasks.completionRate}%</div>
                      <p className="text-xs text-muted-foreground">Completion Rate</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                      <p className="text-lg font-semibold">{emp.tasks.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-lg font-semibold">{emp.tasks.completed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Activities</p>
                      <p className="text-lg font-semibold">{emp.activities}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPipelineReport = () => {
    if (!analyticsData?.data) return null;
    const { pipeline } = analyticsData.data;

    const pipelineData = pipeline.map((item: any) => ({
      stage: item._id,
      count: item.count,
      value: item.totalValue,
      avgValue: item.avgValue,
    }));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
            <CardDescription>Deal distribution and value across pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Deal Count" />
                <Bar
                  yAxisId="right"
                  dataKey="value"
                  fill="#82ca9d"
                  name="Total Value"
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pipelineData.map((stage: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="capitalize">{stage.stage}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Deals:</span>
                    <span className="font-semibold">{stage.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value:</span>
                    <span className="font-semibold">{formatCurrency(stage.value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Value:</span>
                    <span className="font-semibold">{formatCurrency(stage.avgValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderActivityReport = () => {
    if (!analyticsData?.data) return null;
    const { byType, byStatus, byMonth } = analyticsData.data;

    const typeData = byType.map((item: any) => ({
      name: item._id,
      count: item.count,
    }));

    const statusData = byStatus.map((item: any) => ({
      name: item._id,
      count: item.count,
    }));

    const monthData = byMonth.map((item: any) => ({
      name: `${item._id.month}/${item._id.year}`,
      count: item.count,
    }));

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Activities by Type</CardTitle>
              <CardDescription>Distribution of activity types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {typeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activities by Status</CardTitle>
              <CardDescription>Activity completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activities Over Time</CardTitle>
            <CardDescription>Monthly activity trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" name="Activities" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Start Date</label>
          <input
            type="date"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <input
            type="date"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
          />
        </div>
        <Button onClick={handleDateRangeChange}>Apply Filter</Button>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="employee_performance">Performance</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            renderOverviewReport()
          )}
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            renderSalesReport()
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            renderRevenueReport()
          )}
        </TabsContent>

        <TabsContent value="employee_performance" className="mt-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            renderEmployeePerformanceReport()
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            renderPipelineReport()
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            renderActivityReport()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
