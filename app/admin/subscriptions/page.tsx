import Link from "next/link";
import { getAllSubscriptions } from "@/lib/actions/subscriptions";
import { getPendingInvoiceCount } from "@/lib/actions/payments";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { SubscriptionActions } from "./subscription-actions";

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  trialing: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  past_due: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  cancelled: "bg-muted text-muted-foreground border-border",
  expired: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  pending: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
};

export default async function AdminSubscriptionsPage() {
  const [subscriptions, pendingInvoiceCount] = await Promise.all([
    getAllSubscriptions(),
    getPendingInvoiceCount(),
  ]);

  const active = subscriptions.filter((s) => s.status === "active").length;
  const pastDue = subscriptions.filter((s) => s.status === "past_due").length;
  const cancelled = subscriptions.filter(
    (s) => s.status === "cancelled" || s.status === "expired"
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscriptions"
        description="Manage agency subscriptions and billing status."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{subscriptions.length}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-green-600">{active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-amber-500">{pastDue}</span>
            <span className="text-xs text-muted-foreground">Past due</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-muted-foreground">{cancelled}</span>
            <span className="text-xs text-muted-foreground">Cancelled / Expired</span>
          </CardContent>
        </Card>
      </div>

      {pendingInvoiceCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">{pendingInvoiceCount}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Pending invoice request{pendingInvoiceCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                  Agencies have requested invoices. Review and approve them on the Payments page.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
              <Link href="/admin/payments">
                View payments
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All subscriptions</CardTitle>
          <CardDescription>
            Agency subscription status and billing details.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Agency</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Plan</th>
                    <th className="px-4 py-3 text-left font-medium">Brokers</th>
                    <th className="px-4 py-3 text-left font-medium">Period end</th>
                    <th className="px-4 py-3 text-left font-medium">Stripe</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{sub.agency_name}</p>
                          {sub.agency_email && (
                            <p className="text-xs text-muted-foreground">{sub.agency_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={statusColors[sub.status] ?? ""}
                        >
                          {sub.status}
                        </Badge>
                        {sub.cancel_at_period_end && (
                          <span className="ml-1 text-[10px] text-amber-600">cancelling</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.plan_product?.name ?? "Manual"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.broker_count}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.current_period_end
                          ? format(new Date(sub.current_period_end), "d MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub.stripe_subscription_id ? (
                          <Badge variant="outline" className="text-[10px]">
                            Stripe
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Manual</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SubscriptionActions
                          subscriptionId={sub.id}
                          status={sub.status}
                          hasStripe={!!sub.stripe_subscription_id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
