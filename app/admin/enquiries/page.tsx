import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminEnquiriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Enquiries</h1>
      <Card>
        <CardHeader>
          <CardTitle>All enquiries</CardTitle>
          <CardDescription>View all enquiries across brokers (Milestone 6).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 6.</CardContent>
      </Card>
    </div>
  );
}
