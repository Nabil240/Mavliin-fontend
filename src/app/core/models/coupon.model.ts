export interface CouponMember {
  id: number;
  coupon_id: number;
  user_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  usage_limit: number;
  used_count: number;
  remaining_uses?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  usage_limit?: number | null;
  used_count: number;
  expires_at?: string | null;
  is_active: number | boolean;
  is_universal: number | boolean;
  whitelisted_count?: number;
  created_at?: string;
}

export interface AssignCouponMemberPayload {
  user_id?: number;
  email?: string;
  usage_limit: number;
}
