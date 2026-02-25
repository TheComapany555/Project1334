import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage categories</CardTitle>
          <CardDescription>CRUD categories (Milestone 6).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 6.</CardContent>
      </Card>
    </div>
  );
}
