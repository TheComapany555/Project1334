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
