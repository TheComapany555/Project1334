export type PaymentSummary = {
  totalRevenue: number;
  totalTransactions: number;
  paidCount: number;
  pendingCount: number;
  invoicedCount: number;
  approvedCount: number;
  averageValue: number;
  currency: string;
};

export type RevenueTimePoint = {
  date: string;
  revenue: number;
  count: number;
};

export type StatusDistribution = {
  status: string;
  count: number;
  amount: number;
};

export type ProductRevenue = {
  name: string;
  revenue: number;
  count: number;
};
