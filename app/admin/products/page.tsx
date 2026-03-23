import { getAllProducts } from "@/lib/actions/products";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, Package } from "lucide-react";
import Link from "next/link";
import { ProductsTable } from "./products-table";

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All plans</CardTitle>
          <CardDescription>
            Plans and upgrades available to agencies. Active items appear during checkout.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No plans yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first plan to enable subscriptions and listing upgrades.
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/admin/products/new">
                  <PlusIcon className="h-4 w-4" />
                  Add plan
                </Link>
              </Button>
            </div>
          ) : (
            <ProductsTable products={products} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
