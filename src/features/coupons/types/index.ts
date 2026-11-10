export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  min_purchase_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponProduct {
  coupon_id: string;
  product_id: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  order_id: string;
  user_id: string | null;
  discount_applied: number;
  created_at: string;
}

export type DiscountType = 'percent' | 'fixed';

export interface CouponValidationInput {
  code: string;
  productId: string;
  amount: number;
  userId?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
  };
  discount_applied?: number;
  error?: string;
}

export interface CouponFormData {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
  min_purchase_amount: number;
  is_active: boolean;
  product_ids: string[];
}