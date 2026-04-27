export type TimePoint = {
  /** YYYY-MM (UTC) */
  month: string;
  value: number;
};

export type RevenueTimePoint = {
  month: string;
  revenue: number; // cents
  count: number;
};

export type Segment = {
  key: string;
  label: string;
  count: number;
  /** Optional, only set where amount makes sense (revenue). */
  amount?: number;
};

export type TopListing = {
  id: string;
  title: string;
  enquiries: number;
  views: number;
  agencyName: string | null;
  tier: string | null;
};

export type TopCategory = {
  id: string;
  name: string;
  listings: number;
  enquiries: number;
};

export type TopBroker = {
  id: string;
  name: string | null;
  email: string;
  agencyName: string | null;
  listings: number;
  enquiries: number;
};

export type TopAgency = {
  id: string;
  name: string;
  brokers: number;
  listings: number;
  revenue: number; // cents
};

export type RecentPayment = {
  id: string;
  brokerName: string | null;
  agencyName: string | null;
  productName: string | null;
  amount: number; // cents
  status: string;
  createdAt: string;
};

export type RecentEnquiry = {
  id: string;
  contactName: string | null;
  contactEmail: string | null;
  listingTitle: string | null;
  createdAt: string;
};

export type AnalyticsKPIs = {
  /** Cents, paid only, all time. */
  totalRevenue: number;
  /** Cents, sum of price for all currently active subscriptions. */
  mrr: number;
  /** Cents, paid in the last 30 days. */
  revenueLast30Days: number;
  /** Cents, paid 30 to 60 days ago. */
  revenuePrev30Days: number;

  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledLast30Days: number;

  publishedListings: number;
  draftListings: number;
  newListingsLast30Days: number;
  newListingsPrev30Days: number;

  totalAgencies: number;
  activeAgencies: number;
  newAgenciesLast30Days: number;

  totalBrokers: number;
  activeBrokers: number;

  totalEnquiries: number;
  enquiriesLast30Days: number;
  enquiriesPrev30Days: number;

  totalDiscountRedemptions: number;
  totalDiscountSavings: number; // cents

  // Engagement
  totalViews: number;
  viewsLast30Days: number;
  viewsPrev30Days: number;
  totalCalls: number;
  callsLast30Days: number;
  totalNDASignatures: number;
  ndaLast30Days: number;
  totalShareInvites: number;
  shareInvitesOpened: number;
  shareInvitesNDASigned: number;
  shareInvitesAccountCreated: number;

  /** Views to enquiries conversion rate (0..1). */
  viewToEnquiryRate: number;
};

export type AnalyticsCharts = {
  // Time series
  revenueByMonth: RevenueTimePoint[];
  paymentsByMonth: TimePoint[];
  mrrByMonth: TimePoint[];
  newListingsByMonth: TimePoint[];
  enquiriesByMonth: TimePoint[];
  viewsByMonth: TimePoint[];
  ndaSignaturesByMonth: TimePoint[];
  newAgenciesByMonth: TimePoint[];
  newBrokersByMonth: TimePoint[];

  // Segments
  revenueByPaymentType: Segment[];
  paymentsByStatus: Segment[];
  subscriptionsByStatus: Segment[];
  listingsByStatus: Segment[];
  listingsByTier: Segment[];
  listingsByCategory: Segment[];
  agenciesByStatus: Segment[];
  brokersByStatus: Segment[];
  viewsByPlatform: Segment[];
  callsByPlatform: Segment[];

  // Tables
  topListingsByEnquiries: TopListing[];
  topListingsByViews: TopListing[];
  topCategories: TopCategory[];
  topBrokers: TopBroker[];
  topAgencies: TopAgency[];
  recentPayments: RecentPayment[];
  recentEnquiries: RecentEnquiry[];

  topDiscountCodes: Array<{
    code: string;
    percentOff: number;
    redemptions: number;
    maxUses: number | null;
  }>;

  adsByPlacement: Array<{
    placement: "homepage" | "search" | "listing";
    activeAds: number;
    impressions: number;
    clicks: number;
    ctr: number; // 0..1
  }>;
};

export type AdminAnalytics = {
  kpis: AnalyticsKPIs;
  charts: AnalyticsCharts;
  generatedAt: string;
};
