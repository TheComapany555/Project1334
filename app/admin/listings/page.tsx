import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminListingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Listings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Moderate listings</CardTitle>
          <CardDescription>Moderate and remove listings (Milestone 6).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 6.</CardContent>
      </Card>
    </div>
  );
}
