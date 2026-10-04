import type { Condition, OrderStatus, PaymentStatus, ReviewStatus, EnquiryStatus, ProductStatus } from '../types';

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const gbpExact = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-GB');

export const money = (n: number) => gbp.format(n);
export const moneyExact = (n: number) => gbpExact.format(n);
export const number = (n: number) => num.format(n);
export const pct = (n: number, digits = 0) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;

export function delta(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export const STOREFRONT_URL = ((import.meta.env.VITE_STOREFRONT_URL as string | undefined) ?? 'http://localhost:3003').replace(/\/$/, '');

/** Catalogue images are relative paths served by the storefront (/phones/x.webp); the backend will return absolute URLs. */
export function imageUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
  return `${STOREFRONT_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-GB', opts);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

export const CONDITION_LABEL: Record<Condition, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair' };
export const CONDITION_ORDER: Condition[] = ['excellent', 'good', 'fair'];
export const conditionLabel = (c: Condition) => CONDITION_LABEL[c] ?? c;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: 'Confirmed',
  packing: 'Packing',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};
export const ORDER_STATUS_ORDER: OrderStatus[] = ['confirmed', 'packing', 'dispatched', 'delivered', 'cancelled', 'returned'];

/** Which statuses an order can move to from each status. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['packing', 'dispatched', 'cancelled'],
  packing: ['dispatched', 'confirmed', 'cancelled'],
  dispatched: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { paid: 'Paid', 'partially-refunded': 'Part refunded', refunded: 'Refunded' };
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = { open: 'Open', replied: 'Replied', closed: 'Closed' };
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = { active: 'Active', draft: 'Draft', archived: 'Archived' };

export const DELIVERY_LABEL: Record<string, string> = { 'next-day': 'Next-day tracked', standard: 'Standard tracked' };

export const STORAGE_ORDER = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
export const storageIndex = (s: string) => {
  const i = STORAGE_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
};

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function pluralise(n: number, one: string, many = `${one}s`) {
  return `${number(n)} ${n === 1 ? one : many}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function savingsPct(price: number, rrp: number) {
  if (!rrp || rrp <= price) return 0;
  return Math.round(((rrp - price) / rrp) * 100);
}
