"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

async function requireAgencyOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  const agencyId = session.user.agencyId ?? null;
  if (!agencyId) throw new Error("Solo broker — no agency");
  return { userId: session.user.id, agencyId };
}

/**
 * Resolved pricing for a single subscription plan applied to a specific agency.
 * Reflects admin overrides where set, otherwise falls back to product defaults.
 *
 * "Seats" = brokers in `profiles` with `agency_id = agencyId`. Owners count
 * as seats (they're brokers using the platform too).
 */
export type ResolvedPlanQuote = {
  plan_product_id: string;
  plan_name: string;
  pricing_model: "flat" | "tiered_seats";
  /** Effective base price in cents per month (overrides applied). */
  base_price_cents: number;
  currency: string;
  /**
   * Brokers covered by the base price. `null` for legacy flat plans
   * (which include unlimited brokers).
   */
  included_seats: number | null;
  /**
   * Effective per-extra-seat price in cents per month (overrides applied).
   * `null` for legacy flat plans.
   */
  extra_seat_price_cents: number | null;
  /** Current broker count for the agency (accepted brokers only — invitations don't count). */
  current_seats: number;
  /** max(0, current_seats − included_seats). Always 0 for flat plans. */
  extra_seats: number;
  /** base_price_cents + extra_seats × extra_seat_price_cents (rounded). */
  monthly_total_cents: number;
};

/**
 * Count the brokers currently attached to an agency. Only profiles linked
 * via `agency_id` — invitations that haven't been accepted don't count
 * towards seat billing.
 */
export async function countAgencyBrokers(agencyId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId);
  return count ?? 0;
}

type PlanRow = {
  id: string;
  name: string;
  price: number;
  currency: string;
  pricing_model: "flat" | "tiered_seats";
  included_seats: number | null;
  extra_seat_price: number | null;
};

type OverrideRow = {
  custom_price: number | null;
  custom_extra_seat_price: number | null;
  currency: string | null;
};

function quote(
  plan: PlanRow,
  override: OverrideRow | null,
  currentSeats: number,
): ResolvedPlanQuote {
  const basePrice = override?.custom_price ?? plan.price;
  const currency = override?.currency ?? plan.currency;
  let extraSeatPrice: number | null = null;
  let extraSeats = 0;
  let extraTotal = 0;
  if (plan.pricing_model === "tiered_seats") {
    extraSeatPrice =
      override?.custom_extra_seat_price ?? plan.extra_seat_price ?? 0;
    const included = plan.included_seats ?? 0;
    extraSeats = Math.max(0, currentSeats - included);
    extraTotal = extraSeats * (extraSeatPrice ?? 0);
  }
  return {
    plan_product_id: plan.id,
    plan_name: plan.name,
    pricing_model: plan.pricing_model,
    base_price_cents: basePrice,
    currency,
    included_seats:
      plan.pricing_model === "tiered_seats" ? plan.included_seats ?? 0 : null,
    extra_seat_price_cents: extraSeatPrice,
    current_seats: currentSeats,
    extra_seats: extraSeats,
    monthly_total_cents: basePrice + extraTotal,
  };
}

/**
 * Resolve the agency's pricing for a specific plan. Used by the subscribe
 * page to render "what would this plan cost me" for each tier, and by the
 * checkout flow to lock in the right amounts when the agency picks one.
 */
export async function quoteAgencyPlan(
  agencyId: string,
  productId: string,
): Promise<ResolvedPlanQuote | null> {
  const supabase = createServiceRoleClient();
  const [{ data: plan }, { data: override }, currentSeats] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, price, currency, pricing_model, included_seats, extra_seat_price",
      )
      .eq("id", productId)
      .single(),
    supabase
      .from("agency_pricing_overrides")
      .select("custom_price, custom_extra_seat_price, currency")
      .eq("agency_id", agencyId)
      .eq("product_id", productId)
      .maybeSingle(),
    countAgencyBrokers(agencyId),
  ]);
  if (!plan) return null;
  return quote(plan as PlanRow, (override as OverrideRow | null) ?? null, currentSeats);
}

/**
 * Quote every active subscription plan for an agency. Used by the subscribe
 * page to render side-by-side cards with the agency's projected cost on each.
 */
export async function quoteAllPlansForAgency(
  agencyId: string,
): Promise<ResolvedPlanQuote[]> {
  const supabase = createServiceRoleClient();
  const [{ data: plans }, { data: overrides }, currentSeats] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, price, currency, pricing_model, included_seats, extra_seat_price, tier_rank",
      )
      .eq("product_type", "subscription")
      .eq("status", "active")
      .order("tier_rank", { ascending: true, nullsFirst: false })
      .order("price", { ascending: true }),
    supabase
      .from("agency_pricing_overrides")
      .select("product_id, custom_price, custom_extra_seat_price, currency")
      .eq("agency_id", agencyId),
    countAgencyBrokers(agencyId),
  ]);
  if (!plans?.length) return [];
  const overrideByProduct = new Map(
    (overrides ?? []).map((o) => [o.product_id as string, o as OverrideRow]),
  );
  return (plans as (PlanRow & { tier_rank: number | null })[]).map((p) =>
    quote(p, overrideByProduct.get(p.id) ?? null, currentSeats),
  );
}

/**
 * Resolve the agency's CURRENT subscription pricing based on the plan it
 * already subscribed to (uses snapshots so admin price changes don't
 * retroactively bill differently mid-period).
 *
 * If the snapshot columns are NULL (legacy flat-plan subscriptions created
 * before this migration), we fall back to the product's flat price with no
 * seat overage.
 */
export type CurrentSubscriptionPricing = {
  plan_product_id: string;
  plan_name: string;
  pricing_model: "flat" | "tiered_seats";
  base_price_cents: number;
  currency: string;
  included_seats: number | null;
  extra_seat_price_cents: number | null;
  current_seats: number;
  billed_seats: number;
  extra_seats_now: number;
  /** What this period is billing. */
  current_period_total_cents: number;
  /** What next period will bill if seat count stays as it is right now. */
  next_period_total_cents: number;
};

export async function getCurrentSubscriptionPricing(
  agencyId: string,
): Promise<CurrentSubscriptionPricing | null> {
  const supabase = createServiceRoleClient();
  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select(
      `id, plan_product_id, quantity, included_seats_snapshot, extra_seat_price_snapshot,
       plan_product:products!plan_product_id(id, name, price, currency, pricing_model, included_seats, extra_seat_price)`,
    )
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return null;

  const plan = Array.isArray(sub.plan_product)
    ? (sub.plan_product[0] as PlanRow | undefined)
    : ((sub.plan_product ?? undefined) as PlanRow | undefined);
  if (!plan) return null;

  const currentSeats = await countAgencyBrokers(agencyId);

  // Snapshots if present, else fall back to the product defaults.
  const pricingModel: "flat" | "tiered_seats" = plan.pricing_model;
  const includedSeats =
    sub.included_seats_snapshot ?? plan.included_seats ?? null;
  const extraSeatPrice =
    sub.extra_seat_price_snapshot ?? plan.extra_seat_price ?? null;

  const billedSeats = sub.quantity ?? currentSeats;
  const billedExtra =
    pricingModel === "tiered_seats"
      ? Math.max(0, billedSeats - (includedSeats ?? 0))
      : 0;
  const extraNow =
    pricingModel === "tiered_seats"
      ? Math.max(0, currentSeats - (includedSeats ?? 0))
      : 0;

  return {
    plan_product_id: plan.id,
    plan_name: plan.name,
    pricing_model: pricingModel,
    base_price_cents: plan.price,
    currency: plan.currency,
    included_seats: pricingModel === "tiered_seats" ? includedSeats : null,
    extra_seat_price_cents: pricingModel === "tiered_seats" ? extraSeatPrice : null,
    current_seats: currentSeats,
    billed_seats: billedSeats,
    extra_seats_now: extraNow,
    current_period_total_cents:
      plan.price + billedExtra * (extraSeatPrice ?? 0),
    next_period_total_cents: plan.price + extraNow * (extraSeatPrice ?? 0),
  };
}

// ── Session-based wrappers (callable from client components) ────────────────

export async function getMyPlanQuotes(): Promise<ResolvedPlanQuote[]> {
  const { agencyId } = await requireAgencyOwner();
  return quoteAllPlansForAgency(agencyId);
}

export async function getMySubscriptionPricing(): Promise<CurrentSubscriptionPricing | null> {
  const { agencyId } = await requireAgencyOwner();
  return getCurrentSubscriptionPricing(agencyId);
}
