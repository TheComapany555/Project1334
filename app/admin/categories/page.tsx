import { getCategoriesForAdmin } from "@/lib/actions/admin-categories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { CategoriesManager } from "./categories-manager";

export default async function AdminCategoriesPage() {
  const categories = await getCategoriesForAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage listing categories. Inactive categories are hidden from brokers."
      />
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
