import { listDiscountCodes } from "@/lib/actions/discount-codes";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, Tag, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { DiscountCodesTable } from "./discount-codes-table";

export default async function AdminDiscountCodesPage() {
  const codes = await listDiscountCodes();

  const active = codes.filter((c) => c.active).length;
  const totalRedemptions = codes.reduce((sum, c) => sum + c.used_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discount codes"
        description="Promotional codes brokers and agencies can apply at checkout. Stripe processes every redemption (including 100% off), so usage shows up on your Stripe dashboard."
        action={
          <Button asChild className="w-full sm:w-auto gap-1.5">
            <Link href="/admin/discount-codes/new">
              <PlusIcon className="h-4 w-4" />
              New code
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total codes"
          value={codes.length}
          icon={<Tag className="h-4 w-4" />}
        />
        <StatCard
          label="Active"
          value={active}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="emerald"
        />
        <StatCard
          label="Redemptions"
          value={totalRedemptions}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">All codes</CardTitle>
          <CardDescription>
            Codes are validated server side at checkout and synced to Stripe coupons on first use.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <p className="font-semibold">No codes yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first promo code. For example, a 100% onboarding code so brokers can experience the platform free for 60 days.
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
            <DiscountCodesTable codes={codes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
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
