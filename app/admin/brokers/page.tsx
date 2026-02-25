import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminBrokersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Brokers</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage brokers</CardTitle>
          <CardDescription>Approve and disable brokers (Milestone 6).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 6.</CardContent>
      </Card>
    </div>
  );
}
