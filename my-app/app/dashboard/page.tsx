import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Contact } from "../models/Contact";
import { Deal } from "../models/Deal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await connectDB();

  const [contactsCount, dealsCount, wonDeals] = await Promise.all([
    Contact.countDocuments({ ownerId: user.userId }),
    Deal.countDocuments({ ownerId: user.userId }),
    Deal.countDocuments({ ownerId: user.userId, stage: "won" }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{contactsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{dealsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Won Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{wonDeals}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
