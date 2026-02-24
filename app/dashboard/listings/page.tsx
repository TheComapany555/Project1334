import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ListingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Listings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage listings</CardTitle>
          <CardDescription>Create and manage your listings (Milestone 3).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 3.</CardContent>
      </Card>
    </div>
  );
}
