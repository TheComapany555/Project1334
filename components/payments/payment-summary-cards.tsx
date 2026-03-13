"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { PaymentSummary } from "@/lib/types/payment-analytics";
import {
  DollarSign,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
} from "lucide-react";

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type Props = {
  summary: PaymentSummary;
};

const cards = [
  {
    key: "revenue" as const,
    label: "Total Revenue",
    description: "From paid transactions",
    icon: DollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    getValue: (s: PaymentSummary) => formatAmount(s.totalRevenue, s.currency),
  },
  {
    key: "transactions" as const,
    label: "Total Transactions",
    description: "All payment records",
    icon: ArrowUpDown,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    getValue: (s: PaymentSummary) => String(s.totalTransactions),
  },
  {
    key: "paid" as const,
    label: "Successful Payments",
    description: "Completed transactions",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    getValue: (s: PaymentSummary) => String(s.paidCount),
  },
  {
    key: "pending" as const,
    label: "Pending Payments",
    description: "Awaiting processing",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    getValue: (s: PaymentSummary) => String(s.pendingCount),
  },
  {
    key: "invoiced" as const,
    label: "Invoiced",
    description: "Invoice sent",
    icon: FileText,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    getValue: (s: PaymentSummary) => String(s.invoicedCount),
  },
  {
    key: "average" as const,
    label: "Avg Transaction",
    description: "Average paid amount",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    getValue: (s: PaymentSummary) => formatAmount(s.averageValue, s.currency),
  },
];

export function PaymentSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.key} className="relative overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {card.label}
                </p>
                <p className="text-lg sm:text-xl font-bold tracking-tight truncate">
                  {card.getValue(summary)}
                </p>
                <p className="text-[10px] text-muted-foreground/70 hidden sm:block">
                  {card.description}
                </p>
              </div>
              <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
