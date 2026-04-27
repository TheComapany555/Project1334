"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon, Package, Tag, TrendingUp, CheckCircle2 } from "lucide-react";
import type { Product } from "@/lib/types/products";
import type { DiscountCode } from "@/lib/types/discount-codes";
import { ProductsTable } from "./products-table";
import { DiscountCodesTable } from "@/app/admin/discount-codes/discount-codes-table";
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

type Props = {
  products: ProductWithCategory[];
  discountCodes: DiscountCode[];
};

const VALID_TABS = ["all", "category", "discounts"] as const;
type TabValue = (typeof VALID_TABS)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (VALID_TABS as readonly string[]).includes(v);
}

export function ProductsAdminTabs({ products, discountCodes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabValue = isTabValue(tabParam) ? tabParam : "all";

  const categoryFeatured = useMemo(
    () =>
      products.filter(
        (p) => p.product_type === "featured" && p.scope === "category",
      ),
    [products],
  );

  const activeCodes = discountCodes.filter((c) => c.active).length;
  const totalRedemptions = discountCodes.reduce(
    (sum, c) => sum + c.used_count,
    0,
  );

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full gap-4">
      <TabsList className="w-full max-w-xl">
        <TabsTrigger value="all" className="flex-1">
          All plans
        </TabsTrigger>
        <TabsTrigger value="category" className="flex-1">
          Category featuring
        </TabsTrigger>
        <TabsTrigger value="discounts" className="flex-1">
          Discount codes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All plans</CardTitle>
            <CardDescription>
              Subscriptions, listing tiers, homepage featured, category
              featured, and bundles.
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
                  One price per <strong>category</strong> and{" "}
                  <strong>duration</strong> (7 / 14 / 30 days). Brokers only see
                  the plan that matches their listing&apos;s category.
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
                No category-scoped featured products yet. Apply the SQL
                migration or run the same statements in the Supabase SQL editor,
                then refresh this page.
              </div>
            ) : null}
            <ProductsTable products={categoryFeatured} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="discounts" className="mt-0 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DiscountStatCard
            label="Total codes"
            value={discountCodes.length}
            icon={<Tag className="h-4 w-4" />}
          />
          <DiscountStatCard
            label="Active"
            value={activeCodes}
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="emerald"
          />
          <DiscountStatCard
            label="Redemptions"
            value={totalRedemptions}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Discount codes</CardTitle>
                <CardDescription className="max-w-2xl leading-relaxed">
                  Promotional codes brokers and agencies can apply at checkout.
                  Stripe processes every redemption (including 100% off), so
                  usage shows up on your Stripe dashboard with the coupon line
                  item.
                </CardDescription>
              </div>
              <Button asChild className="gap-1.5 shrink-0">
                <Link href="/admin/discount-codes/new">
                  <PlusIcon className="h-4 w-4" />
                  New code
                </Link>
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {discountCodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <p className="font-semibold">No codes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first promo code. For example, a 100%
                    onboarding code so brokers can experience the platform free
                    for 60 days.
                  </p>
                </div>
                <Button asChild size="sm" className="gap-1.5 mt-1">
                  <Link href="/admin/discount-codes/new">
                    <PlusIcon className="h-4 w-4" />
                    Create code
                  </Link>
                </Button>
              </div>
            ) : (
              <DiscountCodesTable codes={discountCodes} />
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function DiscountStatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "emerald";
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center justify-between gap-3 p-0 px-5">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p
            className={
              accent === "emerald"
                ? "text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
                : "text-2xl font-semibold tabular-nums"
            }
          >
            {value}
          </p>
        </div>
        <div
          className={
            accent === "emerald"
              ? "h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
              : "h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0"
          }
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
