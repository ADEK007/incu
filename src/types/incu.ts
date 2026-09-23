export type DeviceStatus = 'inactive' | 'active' | 'online' | 'offline' | 'maintenance' | 'retired';
export type CommandStatus = 'queued' | 'sent' | 'success' | 'failed' | 'expired' | 'cancelled';
export type InvoiceStatus = 'draft' | 'completed' | 'cancelled';
export type PaymentMethodType = 'cash' | 'card' | 'mobile_banking' | 'bank_transfer' | 'credit' | 'other';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'suspended' | 'cancelled';
export type MovementType = 'in' | 'out' | 'adjust' | 'return' | 'wastage';
export type AudienceType = 'all' | 'admin' | 'dealer' | 'customer' | 'farmer' | 'team';
export type CommissionType = 'percent' | 'fixed';
export type DiscountType = 'percent' | 'fixed';

export interface POSCartItem {
  product_id: string;
  variant_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  vat_amount: number;
  line_total: number;
}

export interface DeviceTelemetry {
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  co2_level: number | null;
  status_payload: Record<string, any> | null;
  recorded_at: string;
  is_online: boolean;
  last_seen: string | null;
}

export interface ReportFilter {
  report_type: string;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  product_id?: string;
  dealer_id?: string;
}

export const DEFAULT_EXPENSE_SECTORS = [
  { name: 'Reinvestment', code: 'reinvestment', allocation_percent: 30 },
  { name: 'Hard Marketing', code: 'marketing_hard', allocation_percent: 10, parent: 'marketing' },
  { name: 'Sales', code: 'marketing_sales', allocation_percent: 10, parent: 'marketing' },
  { name: 'Soft Marketing', code: 'marketing_soft', allocation_percent: 5, parent: 'marketing' },
  { name: 'Core Tech Team', code: 'tech_core', allocation_percent: 12, parent: 'technical' },
  { name: 'R&D', code: 'tech_rnd', allocation_percent: 2, parent: 'technical' },
  { name: 'Bonus', code: 'tech_bonus', allocation_percent: 1, parent: 'technical' },
  { name: 'Osmani', code: 'owner_osmani', allocation_percent: 15, parent: 'owner' },
  { name: 'Mobin', code: 'owner_mobin', allocation_percent: 10, parent: 'owner' },
  { name: 'Reserve', code: 'reserve', allocation_percent: 5 },
] as const;
