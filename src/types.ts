// Admin-side shapes. Storefront shapes are vendored in ./types/storefront.ts (from buy-cmm frontend/src/types.ts) so the
// two apps never drift; everything here is what the admin needs *on top of* what the storefront sees.
import type { Condition, DeliveryMethod, GradePhoto, Order, Product, Review } from './types/storefront';

export type { Address, BasketLine, Brand, Colour, Condition, DeliveryMethod, GradePhoto, Order, Paged, Product, ProductSpecs, Review, Variant } from './types/storefront';

// ─── Products ─────────────────────────────────────────────────────────────────
export type ProductStatus = 'active' | 'draft' | 'archived';

export interface AdminProduct extends Product {
  status: ProductStatus;
  featured: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type StockFilter = 'in' | 'low' | 'out';

export interface ProductListQuery {
  search?: string;
  brand?: string;
  series?: string;
  status?: ProductStatus | 'all';
  stock?: StockFilter;
  featured?: boolean;
  sort?: 'name' | 'newest' | 'price-asc' | 'price-desc' | 'stock' | 'updated';
  page?: number;
  pageSize?: number;
}

export type ProductInput = Omit<AdminProduct, 'id' | 'createdAt' | 'updatedAt' | 'fromPrice' | 'rating' | 'reviewCount'> & { rating?: number; reviewCount?: number };

/** A single cell of the storage × colour × condition matrix, flattened for the inventory screen. */
export interface VariantRow {
  productId: string;
  productName: string;
  brand: string;
  slug: string;
  image: string;
  storage: string;
  colour: string;
  condition: Condition;
  price: number;
  stock: number;
  rrp: number;
}

export interface VariantListQuery {
  search?: string;
  brand?: string;
  condition?: Condition;
  storage?: string;
  stock?: StockFilter;
  sort?: 'product' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc';
  page?: number;
  pageSize?: number;
}

export interface VariantUpdate {
  productId: string;
  storage: string;
  colour: string;
  condition: Condition;
  price?: number;
  stock?: number;
}

export interface PriceRule {
  /** Percentage change, e.g. -10 for a 10% cut, or a fixed delta in pounds. */
  mode: 'percent' | 'fixed';
  amount: number;
  brand?: string;
  series?: string;
  condition?: Condition;
  /** Round to the nearest £ ending in this figure (9 → £149, £199). Omit for plain rounding. */
  roundTo?: number;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'confirmed' | 'packing' | 'dispatched' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'paid' | 'partially-refunded' | 'refunded';

export interface Tracking {
  carrier: string;
  number: string;
  url?: string;
}

export interface OrderEvent {
  id: string;
  at: string;
  type: 'created' | 'status' | 'note' | 'payment' | 'email' | 'tracking';
  message: string;
  by: string;
}

export interface AdminOrder extends Omit<Order, 'status'> {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'paypal';
  paymentRef: string;
  refundedAmount: number;
  tracking?: Tracking;
  events: OrderEvent[];
  updatedAt: string;
  flagged: boolean;
}

export interface OrderListQuery {
  search?: string;
  status?: OrderStatus | 'all' | 'open';
  paymentStatus?: PaymentStatus;
  delivery?: DeliveryMethod;
  flagged?: boolean;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest' | 'total-desc' | 'total-asc';
  page?: number;
  pageSize?: number;
}

export interface StatusChange {
  status: OrderStatus;
  tracking?: Tracking;
  note?: string;
  notifyCustomer?: boolean;
}

// ─── Customers ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string; // lower-cased email
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  postcode: string;
  orders: number;
  spent: number;
  firstOrderAt: string;
  lastOrderAt: string;
  subscribed: boolean;
  notes: string;
}

export interface CustomerListQuery {
  search?: string;
  sort?: 'recent' | 'spent' | 'orders' | 'name';
  subscribed?: boolean;
  page?: number;
  pageSize?: number;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReview extends Review {
  status: ReviewStatus;
  productName: string;
  email: string;
  orderNumber?: string;
  reply?: string;
}

export interface ReviewListQuery {
  status?: ReviewStatus | 'all';
  rating?: number;
  productId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── Enquiries / newsletter ───────────────────────────────────────────────────
export type EnquiryStatus = 'open' | 'replied' | 'closed';

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  status: EnquiryStatus;
  orderNumber?: string;
  reply?: string;
  repliedAt?: string;
  assignee?: string;
}

export interface EnquiryListQuery {
  status?: EnquiryStatus | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  status: 'subscribed' | 'unsubscribed';
  source: 'footer' | 'checkout' | 'admin' | 'import';
}

export interface SubscriberListQuery {
  status?: Subscriber['status'] | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface DeliveryOption {
  id: DeliveryMethod;
  label: string;
  description: string;
  fee: number;
  etaDays: number;
  cutoff: string; // "15:00"
  enabled: boolean;
}

export interface ConditionSetting {
  key: Condition;
  label: string;
  short: string;
  blurb: string;
  minBattery: number;
  /** Example photos of a phone in this grade, shown in the storefront's grading guide and on product pages. */
  images: GradePhoto[];
}

export interface Settings {
  store: { name: string; supportEmail: string; whatsapp: string; hours: string; siteUrl: string; warrantyMonths: number; returnsDays: number };
  delivery: DeliveryOption[];
  storages: string[];
  conditions: ConditionSetting[];
  featuredSlugs: string[];
  lowStockThreshold: number;
  payments: { provider: 'paypal'; mode: 'sandbox' | 'live'; clientId: string; merchantEmail: string };
  notifications: { orderEmail: boolean; lowStockEmail: boolean; enquiryEmail: boolean; reviewEmail: boolean; notifyTo: string };
}

// ─── Roles & permissions ─────────────────────────────────────────────────────
export type Permission =
  | 'dashboard.view'
  | 'orders.view' | 'orders.manage' | 'orders.refund' | 'orders.export'
  | 'products.view' | 'products.edit' | 'products.delete' | 'inventory.edit' | 'pricing.rules'
  | 'customers.view' | 'customers.edit'
  | 'reviews.manage' | 'enquiries.manage' | 'subscribers.manage'
  | 'settings.view' | 'settings.edit' | 'team.view' | 'team.manage' | 'activity.view';

export type RoleColor = 'ink' | 'brand' | 'sky' | 'mint' | 'lilac' | 'lemon' | 'peach';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  /** Built-in roles: Owner is locked, Manager and Staff can be edited but not deleted. */
  system: boolean;
  color: RoleColor;
  createdAt: string;
  updatedAt: string;
}

export type RoleInput = Pick<Role, 'name' | 'description' | 'permissions' | 'color'>;

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target?: string;
  targetType?: 'order' | 'product' | 'review' | 'enquiry' | 'subscriber' | 'settings' | 'admin' | 'customer' | 'role';
  detail?: string;
}

export interface ActivityQuery {
  search?: string;
  actor?: string;
  targetType?: ActivityEntry['targetType'];
  page?: number;
  pageSize?: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export type DashboardRange = '7d' | '30d' | '90d';

export interface Compared {
  current: number;
  previous: number;
}

export interface DashboardStats {
  range: DashboardRange;
  days: number;
  revenue: Compared & { today: number };
  orders: Compared & { today: number };
  aov: Compared;
  units: Compared;
  refunds: { amount: number; count: number; rate: number; previousRate: number };
  cancellations: { count: number; rate: number };
  customers: { newCount: number; returningCount: number; repeatRate: number; previousRepeatRate: number };
  fulfilment: { awaiting: number; packing: number; inTransit: number; overdue: number; oldestOpenHours: number; avgHoursToDispatch: number; previousAvgHoursToDispatch: number; onTimePct: number };
  stock: { units: number; value: number; low: number; out: number; healthy: number };
  pendingReviews: number;
  openEnquiries: number;
  subscribers: Compared;
  avgRating: number;
  series: Array<{ date: string; revenue: number; orders: number }>;
  previousSeries: Array<{ date: string; revenue: number; orders: number }>;
  heatmap: number[][]; // [weekday 0=Mon][hour]
  topProducts: Array<{ productId: string; name: string; brand: string; image: string; units: number; revenue: number; stock: number }>;
  restock: Array<{ productId: string; name: string; brand: string; image: string; storage: string; colour: string; condition: Condition; stock: number; soldInRange: number; price: number }>;
  recentOrders: AdminOrder[];
  topCustomers: Array<{ id: string; name: string; email: string; orders: number; spent: number }>;
  stockByCondition: Record<Condition, { units: number; value: number }>;
  salesByCondition: Array<{ key: Condition; units: number; revenue: number }>;
  salesByBrand: Array<{ key: string; units: number; revenue: number }>;
  salesByColour: Array<{ key: string; units: number; revenue: number }>;
  salesByStorage: Array<{ key: string; units: number; revenue: number }>;
  salesBySeries: Array<{ key: string; units: number; revenue: number }>;
  cities: Array<{ key: string; orders: number; revenue: number }>;
  statusCounts: Record<OrderStatus, number>;
  deliverySplit: Record<DeliveryMethod, number>;
  pendingReviewList: AdminReview[];
  openEnquiryList: Enquiry[];
  recentActivity: ActivityEntry[];
}

export interface SearchHit {
  type: 'order' | 'product' | 'customer' | 'enquiry';
  id: string;
  title: string;
  subtitle: string;
  to: string;
}
