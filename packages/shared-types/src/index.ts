export type OrderStatus = 'NEW' | 'COOKING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'VOID';

export type PaymentMethod = 'CASH' | 'QRIS';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  surface_color: string;
  text_primary: string;
  text_secondary: string;
  accent_color: string;
  error_color: string;
  success_color: string;
  font_family: string;
  border_radius: string;
}

export interface BrandingConfig {
  brand_name: string;
  logo_url: string;
  logo_dark_url?: string;
  background_image_url?: string;
  theme: ThemeConfig;
}

export interface FeatureFlags {
  qris_payment: boolean;
  runner_app: boolean;
  customer_display: boolean;
  order_priority: boolean;
}

export interface ReceiptConfig {
  header: string;
  footer: string;
  show_logo: boolean;
  paper_size: '58mm' | '80mm';
  wifi_ssid?: string;
  wifi_password?: string;
}

export interface TenantConfig {
  tenant_id: string;
  branding: BrandingConfig;
  feature_flags: FeatureFlags;
  receipt: ReceiptConfig;
}

export interface MenuItem {
  id: string;
  code: string; // e.g. 'A01'
  name: string;
  price: number;
  category: 'FOOD' | 'BEVERAGE' | 'SNACK' | 'DESSERT';
  description?: string;
  image_url?: string;
  available: boolean;
}

export interface OrderItem {
  id?: string;
  menu_item_id: string;
  code: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string; // e.g. "Pedas, Telur Matang"
  delivery_type?: 'DINE_IN' | 'TAKE_AWAY';
}

export interface Order {
  id: string;
  order_number: string; // e.g. "#125"
  tenant_id: string;
  table_number: string;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  total_price: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  notes?: string;
  delivery_type?: 'DINE_IN' | 'TAKE_AWAY';
  cooking_started_at?: string;
  ready_at?: string;
  delivered_at?: string;
}

export type UserRole = 'KASIR' | 'KITCHEN' | 'RUNNER' | 'MANAGEMENT' | 'SYSADMIN';

export interface User {
  id: string;
  tenant_id: string;
  username: string;
  name: string;
  role: UserRole;
}

