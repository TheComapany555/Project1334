import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getBrokerPayments, getAgencyPayments } from "@/lib/actions/payments";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentLogsTable } from "@/components/payments/payment-logs-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText } from "lucide-react";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/login");

  const isOwner = session.user.agencyRole === "owner";
  const payments = isOwner ? await getAgencyPayments() : await getBrokerPayments();

  const total = payments.length;
  const paid = payments.filter((p) => p.status === "paid").length;
  const inProgress = payments.filter((p) =>
    ["pending", "invoiced", "approved"].includes(p.status),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={isOwner
          ? "All payment activity across your agency."
          : "Your payment history."
        }
      />

      {payments.some((p) => p.status === "invoiced" || p.status === "approved") && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <FileText className="h-4 w-4" />
          <AlertTitle>Invoice in progress</AlertTitle>
          <AlertDescription>
            After you request an invoice, our team sends billing details. Your listing is published
            once payment is confirmed.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-success">{paid}</span>
            <span className="text-xs text-muted-foreground">Confirmed paid</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-warning">{inProgress}</span>
            <span className="text-xs text-muted-foreground">In progress</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Payment logs</CardTitle>
        </CardHeader>
        <Separator className="mt-4" />
        <CardContent className="p-0">
          <PaymentLogsTable payments={payments} showBroker={isOwner} />
        </CardContent>
      </Card>
    </div>
  );
}
