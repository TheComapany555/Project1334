import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { DiscountCode } from "@/lib/types/discount-codes";

/**
 * Ensure a Stripe Coupon exists for the given discount code. Returns the
 * Stripe coupon ID. Stripe coupons are immutable, so if the code's percent_off
 * changes the admin layer clears stripe_coupon_id and a new coupon is minted
 * here on next redemption.
 *
 * The Stripe coupon is created with `duration: 'once'` (single-checkout
 * application). Multi-use limits are enforced on our side via discount_codes
 * .max_uses / .used_count, so we don't set max_redemptions on Stripe — that
 * lets us keep one Stripe coupon for unlimited reuse across sessions.
 */
export async function ensureStripeCoupon(
  discountCode: DiscountCode
): Promise<string> {
  if (discountCode.stripe_coupon_id) {
    try {
      // Verify it still exists in Stripe (could have been deleted manually).
      const existing = await stripe.coupons.retrieve(
        discountCode.stripe_coupon_id
      );
      if (existing && !existing.deleted) {
        return existing.id;
      }
    } catch {
      // Fall through to create a new one.
    }
  }

  const coupon = await stripe.coupons.create({
    percent_off: discountCode.percent_off,
    duration: "once",
    name: discountCode.code,
    metadata: {
      discount_code_id: discountCode.id,
      discount_code: discountCode.code,
    },
  });

  const supabase = createServiceRoleClient();
  await supabase
    .from("discount_codes")
    .update({
      stripe_coupon_id: coupon.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountCode.id);

  return coupon.id;
}

/**
 * Clear the cached Stripe coupon ID — called when an admin edits percent_off
 * (Stripe coupons are immutable) or after we discover a stale reference.
 * The Stripe coupon itself is left in place; new sessions will mint a fresh
 * coupon on demand.
 */
export async function invalidateStripeCoupon(
  discountCodeId: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("discount_codes")
    .update({
      stripe_coupon_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountCodeId);
}
