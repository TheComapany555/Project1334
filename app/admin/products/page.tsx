import { getAllProducts } from "@/lib/actions/products";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { ProductsAdminTabs } from "./products-admin-tabs";

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  const active = products.filter((p) => p.status === "active").length;
  const inactive = products.filter((p) => p.status === "inactive").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pricing & Plans"
        description="Manage subscription plans, listing upgrades, and pricing."
        action={
          <Button asChild className="w-full sm:w-auto gap-1.5">
            <Link href="/admin/products/new">
              <PlusIcon className="h-4 w-4" />
              Add plan
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{products.length}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-primary">{active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-muted-foreground">{inactive}</span>
            <span className="text-xs text-muted-foreground">Inactive</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Plans</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Switch tabs to manage everything together or focus on category-based featured pricing.
        </p>
      </div>

      <ProductsAdminTabs products={products} />
    </div>
  );
}
