import { notFound } from "next/navigation";
import { getProductById } from "@/lib/actions/products";
import { getCategories } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProductForm } from "../../product-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit plan"
        description={`Editing "${product.name}"`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan details</CardTitle>
          <CardDescription>
            Update the name, pricing, or duration for this plan.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <ProductForm product={product} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
