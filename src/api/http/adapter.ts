// Talks to the (future) BuyUpon backend. Endpoints are documented in ../../../API_CONTRACT.md under "Admin API".
import type { AdminApi, AuthSession } from '../types';
import type { AdminOrder, AdminProduct, AdminReview, AdminUser, Customer, Enquiry, Role } from '../../types';

type CustomerBundle = { customer: Customer; orders: AdminOrder[]; reviews: AdminReview[]; enquiries: Enquiry[] };
import { readJson, removeKey, writeJson } from '../../lib/storage';

const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');
const SESSION_KEY = 'buyupon.admin.session';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readJson<AuthSession | null>(SESSION_KEY, null);
  const res = await fetch(`${BASE}/api/buy/admin${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}), ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    removeKey(SESSION_KEY);
    if (!path.startsWith('/auth/')) window.location.assign('/login');
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string; detail?: string };
      message = body.message ?? body.detail ?? message;
    } catch {
      /* no body */
    }
    throw new Error(message || `API ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(obj: Record<string, unknown>): string {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all') return;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
const del: RequestInit = { method: 'DELETE' };
const q = (o: object) => qs(o as Record<string, unknown>);

export const httpApi: AdminApi = {
  requestOtp: (email) => request('/auth/request-otp', json({ email })),
  verifyOtp: async (email, code) => {
    const s = await request<AuthSession>('/auth/verify-otp', json({ email, code }));
    writeJson(SESSION_KEY, s);
    return s;
  },
  // A network failure must not be mistaken for "signed out": only an auth rejection returns null.
  me: () =>
    request<{ user: AdminUser; role: Role }>('/auth/me').catch((e: unknown) => {
      if (e instanceof Error && /^(Unauthorized|Sign in|This account|No role)/.test(e.message)) return null;
      throw e;
    }),
  logout: async () => {
    await request('/auth/logout', json({})).catch(() => undefined);
    removeKey(SESSION_KEY);
  },

  getDashboard: (range) => request(`/dashboard${qs({ range })}`),
  search: (term) => request(`/search${qs({ q: term })}`),

  listProducts: (query) => request(`/products${q(query)}`),
  getProduct: (id) => request<AdminProduct>(`/products/${id}`).catch(() => null),
  createProduct: (input) => request('/products', json(input)),
  updateProduct: (id, body) => request(`/products/${id}`, patch(body)),
  deleteProduct: (id) => request(`/products/${id}`, del),
  listVariants: (query) => request(`/variants${q(query)}`),
  updateVariants: (updates) => request('/variants', patch({ updates })),
  previewPriceRule: (rule) => request('/pricing/preview', json(rule)),
  applyPriceRule: (rule) => request('/pricing/apply', json(rule)),
  listSeries: () => request('/products/series'),

  listOrders: (query) => request(`/orders${q(query)}`),
  getOrder: (n) => request<AdminOrder>(`/orders/${n}`).catch(() => null),
  changeOrderStatus: (n, change) => request(`/orders/${n}/status`, json(change)),
  addOrderNote: (n, note) => request(`/orders/${n}/notes`, json({ note })),
  setOrderTracking: (n, tracking) => request(`/orders/${n}/tracking`, json(tracking)),
  refundOrder: (n, amount, reason) => request(`/orders/${n}/refund`, json({ amount, reason })),
  resendOrderEmail: (n, kind) => request(`/orders/${n}/emails`, json({ kind })),
  flagOrder: (n, flagged) => request(`/orders/${n}`, patch({ flagged })),
  updateOrderCustomer: (n, customer) => request(`/orders/${n}`, patch({ customer })),

  listCustomers: (query) => request(`/customers${q(query)}`),
  getCustomer: (id) => request<CustomerBundle>(`/customers/${encodeURIComponent(id)}`).catch(() => null),
  updateCustomerNotes: (id, notes) => request(`/customers/${encodeURIComponent(id)}`, patch({ notes })),

  listReviews: (query) => request(`/reviews${q(query)}`),
  setReviewStatus: (id, status) => request(`/reviews/${id}`, patch({ status })),
  replyToReview: (id, reply) => request(`/reviews/${id}`, patch({ reply })),
  deleteReview: (id) => request(`/reviews/${id}`, del),

  listEnquiries: (query) => request(`/enquiries${q(query)}`),
  updateEnquiry: (id, body) => request(`/enquiries/${id}`, patch(body)),
  listSubscribers: (query) => request(`/subscribers${q(query)}`),
  addSubscriber: (email) => request('/subscribers', json({ email })),
  setSubscriberStatus: (id, status) => request(`/subscribers/${id}`, patch({ status })),
  deleteSubscriber: (id) => request(`/subscribers/${id}`, del),

  getSettings: () => request('/settings'),
  updateSettings: (body) => request('/settings', patch(body)),
  listAdmins: () => request('/admins'),
  addAdmin: (input) => request('/admins', json(input)),
  updateAdmin: (id, body) => request(`/admins/${id}`, patch(body)),
  removeAdmin: (id) => request(`/admins/${id}`, del),
  listRoles: () => request('/roles'),
  createRole: (input) => request('/roles', json(input)),
  updateRole: (id, body) => request(`/roles/${id}`, patch(body)),
  deleteRole: (id) => request(`/roles/${id}`, del),
  listActivity: (query) => request(`/activity${q(query)}`),

  getSystem: () => request('/system'),
};
