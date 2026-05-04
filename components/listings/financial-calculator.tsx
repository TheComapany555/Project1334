"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  DollarSign,
  Percent,
  Calendar,
  TrendingUp,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react";

type Props = {
  askingPrice: number | null;
  profit: number | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseInterestDraft(s: string): number | null {
  const t = s.trim();
  if (t === "" || t === ".") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseTermDraft(s: string): number | null {
  const t = s.replace(/\D/g, "");
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function FinancialCalculator({ askingPrice, profit }: Props) {
  const [deposit, setDeposit] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState("");
  const [termDraft, setTermDraft] = useState("");

  const interestRate = parseInterestDraft(rateDraft);
  const loanTerm = parseTermDraft(termDraft);

  const suggestedDeposit = useMemo(() => {
    const price = Number(askingPrice) || 0;
    if (price <= 0) return null;
    return Math.round(price * 0.2);
  }, [askingPrice]);

  const calculations = useMemo(() => {
    const price = Number(askingPrice) || 0;
    const depositAmount = Number(deposit) || 0;
    const rate = interestRate ?? 0;
    const term = loanTerm ?? 0;

    const loanAmount = Math.max(0, price - depositAmount);
    const weeklyRate = rate / 100 / 52;
    const totalWeeks = term * 52;

    let weeklyRepayment = 0;
    if (loanAmount > 0 && weeklyRate > 0 && totalWeeks > 0) {
      weeklyRepayment =
        (loanAmount * weeklyRate * Math.pow(1 + weeklyRate, totalWeeks)) /
        (Math.pow(1 + weeklyRate, totalWeeks) - 1);
    } else if (loanAmount > 0 && totalWeeks > 0) {
      weeklyRepayment = loanAmount / totalWeeks;
    }

    const monthlyRepayment = weeklyRepayment * (52 / 12);
    const annualRepayment = weeklyRepayment * 52;
    const totalRepayment = weeklyRepayment * totalWeeks;
    const totalInterest = totalRepayment - loanAmount;

    const annualProfit = Number(profit) || 0;
    const roi = price > 0 && annualProfit > 0 ? (annualProfit / price) * 100 : 0;

    const annualCashFlow = annualProfit - annualRepayment;
    const cashOnCash =
      depositAmount > 0 ? (annualCashFlow / depositAmount) * 100 : 0;

    return {
      loanAmount,
      weeklyRepayment,
      monthlyRepayment,
      annualRepayment,
      totalRepayment,
      totalInterest,
      roi,
      cashOnCash,
      annualCashFlow,
    };
  }, [askingPrice, deposit, interestRate, loanTerm, profit]);

  if (!askingPrice || askingPrice <= 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Financial Snapshot
        </CardTitle>
        <CardDescription>
          Estimate your loan repayments, ROI, and cash-on-cash return
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs — empty by default so mobile users can type without fighting a “0” */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label
              htmlFor="calc-deposit"
              className="text-sm flex items-center gap-1.5"
            >
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Deposit Amount
            </Label>
            <MoneyInput
              id="calc-deposit"
              value={deposit}
              onValueChange={setDeposit}
              placeholder="Optional"
              aria-describedby={suggestedDeposit ? "calc-deposit-hint" : undefined}
            />
            {suggestedDeposit != null && (
              <p id="calc-deposit-hint" className="text-xs text-muted-foreground">
                20% of asking price is about {formatCurrency(suggestedDeposit)} — enter any
                amount above.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="calc-rate"
              className="text-sm flex items-center gap-1.5"
            >
              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
              Interest Rate (% p.a.)
            </Label>
            <Input
              id="calc-rate"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={rateDraft}
              placeholder="e.g. 6.5"
              className="tabular-nums"
              onChange={(e) => {
                let next = e.target.value.replace(/[^\d.]/g, "");
                const dot = next.indexOf(".");
                if (dot !== -1) {
                  next =
                    next.slice(0, dot + 1) +
                    next.slice(dot + 1).replace(/\./g, "");
                }
                setRateDraft(next);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="calc-term"
              className="text-sm flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Loan Term (years)
            </Label>
            <Input
              id="calc-term"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={termDraft}
              placeholder="e.g. 10"
              className="tabular-nums"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setTermDraft(digits);
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Results */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard
            icon={<ArrowDownRight className="h-4 w-4 text-blue-600" />}
            label="Weekly Repayment"
            value={formatCurrency(calculations.weeklyRepayment)}
            bgColor="bg-blue-50 dark:bg-blue-950/30"
          />
          <ResultCard
            icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
            label="Monthly Repayment"
            value={formatCurrency(calculations.monthlyRepayment)}
            bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <ResultCard
            icon={<TrendingUp className="h-4 w-4 text-violet-600" />}
            label="Estimated ROI"
            value={
              calculations.roi > 0
                ? `${calculations.roi.toFixed(1)}%`
                : "N/A"
            }
            subtitle={profit ? `Based on ${formatCurrency(Number(profit))} profit` : undefined}
            bgColor="bg-violet-50 dark:bg-violet-950/30"
          />
          <ResultCard
            icon={<PiggyBank className="h-4 w-4 text-amber-600" />}
            label="Cash-on-Cash Return"
            value={
              (deposit ?? 0) > 0 && calculations.cashOnCash !== 0
                ? `${calculations.cashOnCash.toFixed(1)}%`
                : "N/A"
            }
            subtitle={
              calculations.annualCashFlow !== 0
                ? `${formatCurrency(calculations.annualCashFlow)}/yr net`
                : undefined
            }
            bgColor="bg-amber-50 dark:bg-amber-950/30"
          />
        </div>

        {/* Loan Summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            LOAN SUMMARY
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Loan Amount</dt>
              <dd className="font-medium">
                {formatCurrency(calculations.loanAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Annual Repayment</dt>
              <dd className="font-medium">
                {formatCurrency(calculations.annualRepayment)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total Interest</dt>
              <dd className="font-medium">
                {formatCurrency(calculations.totalInterest)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total Repayment</dt>
              <dd className="font-medium">
                {formatCurrency(calculations.totalRepayment)}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-xs text-muted-foreground">
          This calculator provides estimates only and should not be considered
          financial advice. Please consult a licensed financial adviser before
          making any investment decisions.
        </p>
      </CardContent>
    </Card>
  );
}

function ResultCard({
  icon,
  label,
  value,
  subtitle,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
