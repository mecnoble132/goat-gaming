export type UserRole = 'owner' | 'staff';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export interface Customer {
  id: string; // CUS-1234 format
  name?: string;
  phone: string;
  whatsapp_number?: string;
  loyalty_points: number;
  visits: number;
  created_at: string;
}

export type GameType = string;

export interface BasePricing {
  id: string;
  game_type: GameType;
  label: string;
  price: number;
  duration_minutes: number;
  controllers?: number; // For PS5
}

export interface Product {
  id: string;
  name: string;
  category: string;
  mrp: number;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at?: string;
}

export interface Bill {
  id: string;
  customer_id?: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  payment_method: 'cash' | 'upi' | 'card';
  staff_id: string;
  created_at: string;
  status: 'finalized' | 'cancelled';
}

export interface BillItem {
  id: string;
  bill_id: string;
  item_type: 'session' | 'product';
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata?: any; // e.g., duration, controllers
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  bill_id: string;
  points_earned: number;
  points_redeemed: number;
  type: 'earn' | 'redeem';
  created_at: string;
}

export interface LoyaltySettings {
  id: string;
  earn_rate_points: number;
  earn_rate_minutes: number;
  redeem_rate_points: number;
  redeem_rate_minutes: number;
}
