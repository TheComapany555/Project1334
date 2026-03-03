import { getCategoriesForAdmin } from "@/lib/actions/admin-categories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoriesManager } from "./categories-manager";

export default async function AdminCategoriesPage() {
  const categories = await getCategoriesForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Manage listing categories. Inactive categories are hidden from brokers.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage categories</CardTitle>
          <CardDescription>
            Add, edit, or deactivate categories. Brokers choose a category when creating listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager initialCategories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
