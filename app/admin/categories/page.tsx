import {
  getCategoriesForAdmin,
  getSubcategoriesForAdmin,
} from "@/lib/actions/admin-categories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { CategoriesManager } from "./categories-manager";
import { SubcategoriesManager } from "./subcategories-manager";

export default async function AdminCategoriesPage() {
  const [categories, subcategories] = await Promise.all([
    getCategoriesForAdmin(),
    getSubcategoriesForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage listing categories and sub-categories. Inactive items are hidden from brokers."
      />
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Add, edit, or deactivate top-level categories. Brokers choose a category when creating listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager initialCategories={categories} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sub-categories</CardTitle>
          <CardDescription>
            Manage the second level. Pick a parent category, then add, edit, or deactivate its sub-categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubcategoriesManager categories={categories} subcategories={subcategories} />
        </CardContent>
      </Card>
    </div>
  );
}
