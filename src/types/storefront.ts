// Storefront contract types, vendored from the buy-cmm repository (frontend/src/types.ts). Keep in sync when that file changes.

export type Brand = 'Apple' | 'Samsung';
export type Condition = 'premium' | 'excellent' | 'good' | 'fair';

/** A finish the model is sold in. `image` is the photo shown when that colour is picked. */
export interface Colour {
  name: string;
  hex: string;
  image: string;
}

export interface Variant {
  storage: string;
  /** One of the product's `colours` names, or '' when the product has no colour options. */
  colour: string;
  condition: Condition;
  price: number; // GBP, whole pounds
  stock: number;
}

export interface ProductSpecs {
  display: string;
  chip: string;
  camera: string;
  battery: string;
  connectivity: string;
}

export interface Product {
  id: string;
  slug: string;
  brand: Brand | string;
  name: string;
  series: string;
  releaseYear: number;
  image: string;
  rrp: number;
  fromPrice: number;
  rating: number;
  reviewCount: number;
  specs: ProductSpecs;
  storages: string[];
  colours: Colour[];
  variants: Variant[];
}

export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'newest';

export interface ProductQuery {
  brand?: string[];
  series?: string[];
  condition?: Condition[];
  storage?: string[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  brands: FacetOption[];
  series: FacetOption[];
  conditions: FacetOption[];
  storages: FacetOption[];
  priceRange: { min: number; max: number };
}

export interface BasketLine {
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  storage: string;
  colour: string;
  condition: Condition;
  unitPrice: number;
  quantity: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
}

export type DeliveryMethod = 'standard' | 'next-day';

export interface CheckoutRequest {
  lines: Array<Pick<BasketLine, 'productId' | 'storage' | 'colour' | 'condition' | 'quantity'>>;
  customer: Address;
  delivery: DeliveryMethod;
  paymentToken: string;
}

export interface Order {
  orderNumber: string;
  createdAt: string;
  status: 'confirmed' | 'packing' | 'dispatched' | 'delivered' | 'cancelled' | 'returned';
  lines: BasketLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  delivery: DeliveryMethod;
  customer: Address;
  estimatedDelivery: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  reply?: string;
}

export interface ReviewInput {
  author: string;
  email: string;
  orderNumber?: string;
  rating: number;
  title: string;
  body: string;
}

/** Slim product used by the mega menu, instant search and showcase tiles. */
export type MenuProduct = Pick<Product, 'id' | 'slug' | 'brand' | 'name' | 'series' | 'image' | 'fromPrice' | 'rrp' | 'releaseYear' | 'rating' | 'reviewCount' | 'storages'> & { inStock: boolean };

export interface DeliveryOption {
  id: DeliveryMethod;
  label: string;
  description: string;
  fee: number;
  etaDays: number;
  cutoff: string;
  enabled: boolean;
}

/** An example photo of a phone in one grade. `caption` says what it shows, e.g. "Body". */
export interface GradePhoto {
  url: string;
  caption: string;
}

/** Store configuration managed in the admin panel. */
export interface StoreConfig {
  store: { name: string; supportEmail: string; whatsapp: string; hours: string; warrantyMonths: number; returnsDays: number };
  delivery: DeliveryOption[];
  conditions: Array<{ key: Condition; label: string; short: string; blurb: string; minBattery: number; images: GradePhoto[] }>;
  paypal: { mode: 'sandbox' | 'live'; clientId: string };
}
