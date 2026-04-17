import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCategories } from "@/lib/actions/listings";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add plan"
        description="Create a new subscription plan or listing upgrade."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan details</CardTitle>
          <CardDescription>
            Set the name, pricing, and duration for this plan.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <ProductForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
