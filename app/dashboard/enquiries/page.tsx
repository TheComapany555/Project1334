import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EnquiriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Enquiries</h1>
      <Card>
        <CardHeader>
          <CardTitle>My enquiries</CardTitle>
          <CardDescription>View and manage enquiries (Milestone 5).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 5.</CardContent>
      </Card>
    </div>
  );
}
