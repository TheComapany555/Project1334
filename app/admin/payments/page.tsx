import { getAllPayments } from "@/lib/actions/payments";
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

export default async function AdminPaymentsPage() {
  const payments = await getAllPayments();

  const summary = computePaymentSummary(payments);
  const revenueTimeSeries = computeRevenueTimeSeries(payments);
  const statusDistribution = computeStatusDistribution(payments);
  const productRevenue = computeProductRevenue(payments);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Monitor platform-wide revenue, transactions, and payment activity."
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
          <PaymentLogsTable payments={payments} showBroker showActions />
        </CardContent>
      </Card>
    </div>
  );
}
