import { getAllPayments, getPendingInvoiceCount } from "@/lib/actions/payments";
import { getAllSubscriptions } from "@/lib/actions/subscriptions";
import { Badge } from "@/components/ui/badge";
import { CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { SubscriptionActions } from "@/app/admin/subscriptions/subscription-actions";
import {
  computePaymentSummary,
  computeRevenueTimeSeries,
  computeStatusDistribution,
  computeProductRevenue,
} from "@/lib/utils/payment-analytics";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentSummaryCards } from "@/components/payments/payment-summary-cards";
import { RevenueChart } from "@/components/payments/revenue-chart";
import { StatusDistributionChart } from "@/components/payments/status-distribution-chart";
import { ProductRevenueChart } from "@/components/payments/product-revenue-chart";
import { PaymentLogsTable } from "@/components/payments/payment-logs-table";

const subStatusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  trialing: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  past_due: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  cancelled: "bg-muted text-muted-foreground border-border",
  expired: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  pending: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
};

export default async function AdminPaymentsPage() {
  const [payments, subscriptions] = await Promise.all([
    getAllPayments(),
    getAllSubscriptions(),
  ]);

  const summary = computePaymentSummary(payments);
  const revenueTimeSeries = computeRevenueTimeSeries(payments);
  const statusDistribution = computeStatusDistribution(payments);
  const productRevenue = computeProductRevenue(payments);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Subscriptions"
        description="Monitor platform-wide revenue, transactions, and subscription status."
      />

      {/* Summary Cards */}
      <PaymentSummaryCards summary={summary} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueTimeSeries} />
        </div>
        <StatusDistributionChart data={statusDistribution} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRevenueChart data={productRevenue} />
      </div>

      {/* Invoice requests alert */}
      {(() => {
        const invoiced = payments.filter((p) => p.status === "invoiced");
        if (invoiced.length === 0) return null;
        return (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">{invoiced.length}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Pending invoice request{invoiced.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                    Agencies have requested invoices instead of card payment. Review and send invoices.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Payment Logs Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Payment Logs</CardTitle>
        </CardHeader>
        <Separator className="mt-4" />
        <CardContent className="p-0">
          <PaymentLogsTable payments={payments} showBroker />
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscriptions</CardTitle>
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
                        <Badge variant="outline" className={subStatusColors[sub.status] ?? ""}>
                          {sub.status}
                        </Badge>
                        {sub.cancel_at_period_end && (
                          <span className="ml-1 text-[10px] text-amber-600">cancelling</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.plan_product?.name ?? "Manual"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{sub.broker_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.current_period_end
                          ? format(new Date(sub.current_period_end), "d MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub.stripe_subscription_id ? (
                          <Badge variant="outline" className="text-[10px]">Stripe</Badge>
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
