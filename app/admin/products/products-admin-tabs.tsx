"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PlusIcon, Package } from "lucide-react";
import type { Product } from "@/lib/types/products";
import { ProductsTable } from "./products-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProductWithCategory = Product & {
  category?: { id: string; name: string } | null;
};

export function ProductsAdminTabs({ products }: { products: ProductWithCategory[] }) {
  const categoryFeatured = useMemo(
    () =>
      products.filter(
        (p) => p.product_type === "featured" && p.scope === "category"
      ),
    [products]
  );

  return (
    <Tabs defaultValue="all" className="w-full gap-4">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="all" className="flex-1">
          All plans
        </TabsTrigger>
        <TabsTrigger value="category" className="flex-1">
          Category featuring
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All plans</CardTitle>
            <CardDescription>
              Subscriptions, listing tiers, homepage featured, category featured, and bundles.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">No plans yet</p>
                  <p className="text-sm text-muted-foreground">
                    Run the featured-products SQL migration (or paste{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      supabase/migrations/20260418140000_seed_featured_product_variants.sql
                    </code>{" "}
                    in the Supabase SQL editor), then refresh.
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
      </TabsContent>

      <TabsContent value="category" className="mt-0 space-y-4">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Category featuring</CardTitle>
                <CardDescription className="max-w-2xl leading-relaxed">
                  One price per <strong>category</strong> and <strong>duration</strong> (7 / 14 /
                  30 days). Brokers only see the plan that matches their listing&apos;s category.
                  Seed rows with SQL: migration file{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    20260418140000_seed_featured_product_variants.sql
                  </code>{" "}
                  (idempotent). Adjust prices here after seeding.
                </CardDescription>
              </div>
              <Button asChild variant="outline" className="gap-1.5 shrink-0">
                <Link href="/admin/products/new?focus=category">
                  <PlusIcon className="h-4 w-4" />
                  Add manually
                </Link>
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {categoryFeatured.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground border-b border-border">
                No category-scoped featured products yet. Apply the SQL migration or run the same
                statements in the Supabase SQL editor, then refresh this page.
              </div>
            ) : null}
            <ProductsTable products={categoryFeatured} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
