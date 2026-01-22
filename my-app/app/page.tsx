import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Deal } from "./models/Deal";
import { User } from "./models/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  // This is SERVER COMPONENT - getCurrentUser() works here
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectDB();

  const [contactsCount, dealsCount] = await Promise.all([
    User.countDocuments({ ownerId: user.userId, role: "contact" }),
    Deal.countDocuments({ ownerId: user.userId }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.email}!</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dealsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
