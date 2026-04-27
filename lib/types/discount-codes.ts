export type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  percent_off: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  stripe_coupon_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DiscountValidationResult =
  | {
      ok: true;
      code: {
        id: string;
        code: string;
        percent_off: number;
      };
      original_amount: number;
      discount_amount: number;
      final_amount: number;
      currency: string;
      is_free: boolean;
    }
  | {
      ok: false;
      error: string;
    };
