import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Deal } from "../../models/Deal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default async function DealsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await connectDB();

  const deals = await Deal.find({ ownerId: user.userId })
    .populate("contactId")
    .lean();

  const getStageVariant = (stage: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      new: "outline",
      qualified: "secondary",
      proposal: "default",
      won: "default",
      lost: "destructive",
    };
    return variants[stage] || "outline";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
        <p className="text-muted-foreground">
          Track and manage your sales pipeline
        </p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Close Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal: any) => (
              <TableRow key={deal._id}>
                <TableCell className="font-medium">{deal.title}</TableCell>
                <TableCell>${deal.value.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={getStageVariant(deal.stage)}>
                    {deal.stage}
                  </Badge>
                </TableCell>
                <TableCell>
                  {deal.contactId?.name || "No contact"}
                </TableCell>
                <TableCell>
                  {deal.closeDate
                    ? new Date(deal.closeDate).toLocaleDateString()
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
            {deals.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  No deals yet. Create your first deal to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
