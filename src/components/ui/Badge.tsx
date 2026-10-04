import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { EnquiryStatus, OrderStatus, PaymentStatus, ProductStatus, ReviewStatus, Role, RoleColor } from '../../types';
import { ENQUIRY_STATUS_LABEL, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_STATUS_LABEL, REVIEW_STATUS_LABEL } from '../../lib/format';

export type Tone = 'neutral' | 'mint' | 'sky' | 'lilac' | 'peach' | 'lemon' | 'ink' | 'brand' | 'outline';

const tones: Record<Tone, string> = {
  neutral: 'bg-cream text-ink-2',
  mint: 'bg-tint-mint text-success',
  sky: 'bg-tint-sky text-info',
  lilac: 'bg-tint-lilac text-violet',
  peach: 'bg-tint-peach text-brand-700',
  lemon: 'bg-tint-lemon text-warn',
  ink: 'bg-ink text-white',
  brand: 'bg-brand-600 text-white',
  outline: 'border border-line bg-white text-ink-2',
};

export function Badge({ children, tone = 'neutral', className, dot }: { children: ReactNode; tone?: Tone; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export const ORDER_TONE: Record<OrderStatus, Tone> = { confirmed: 'lemon', packing: 'lilac', dispatched: 'sky', delivered: 'mint', cancelled: 'peach', returned: 'peach' };
export const PAYMENT_TONE: Record<PaymentStatus, Tone> = { paid: 'mint', 'partially-refunded': 'lemon', refunded: 'peach' };
export const REVIEW_TONE: Record<ReviewStatus, Tone> = { pending: 'lemon', approved: 'mint', rejected: 'peach' };
export const ENQUIRY_TONE: Record<EnquiryStatus, Tone> = { open: 'lemon', replied: 'sky', closed: 'neutral' };
export const PRODUCT_TONE: Record<ProductStatus, Tone> = { active: 'mint', draft: 'lemon', archived: 'neutral' };

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => <Badge tone={ORDER_TONE[status]} dot>{ORDER_STATUS_LABEL[status]}</Badge>;
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
export const ReviewBadge = ({ status }: { status: ReviewStatus }) => <Badge tone={REVIEW_TONE[status]} dot>{REVIEW_STATUS_LABEL[status]}</Badge>;
export const EnquiryBadge = ({ status }: { status: EnquiryStatus }) => <Badge tone={ENQUIRY_TONE[status]} dot>{ENQUIRY_STATUS_LABEL[status]}</Badge>;
export const ProductBadge = ({ status }: { status: ProductStatus }) => <Badge tone={PRODUCT_TONE[status]} dot>{PRODUCT_STATUS_LABEL[status]}</Badge>;

export function StockBadge({ stock, low }: { stock: number; low: number }) {
  if (stock === 0) return <Badge tone="peach">Out</Badge>;
  if (stock <= low) return <Badge tone="lemon">Low · {stock}</Badge>;
  return <Badge tone="mint">{stock} in stock</Badge>;
}

export function ConditionBadge({ condition }: { condition: 'excellent' | 'good' | 'fair' }) {
  const map = { excellent: ['mint', 'Excellent'], good: ['sky', 'Good'], fair: ['lemon', 'Fair'] } as const;
  return <Badge tone={map[condition][0]}>{map[condition][1]}</Badge>;
}

export const ROLE_TONE: Record<RoleColor, Tone> = { ink: 'ink', brand: 'brand', sky: 'sky', mint: 'mint', lilac: 'lilac', lemon: 'lemon', peach: 'peach' };
export function RoleBadge({ role, className }: { role: Pick<Role, 'name' | 'color'>; className?: string }) {
  return <Badge tone={ROLE_TONE[role.color]} className={className}>{role.name}</Badge>;
}
