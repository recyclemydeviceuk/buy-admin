import type {
  ActivityEntry, ActivityQuery, AdminOrder, AdminProduct, AdminReview, AdminUser, Customer, CustomerListQuery, DashboardRange, DashboardStats,
  Enquiry, EnquiryListQuery, OrderListQuery, Paged, PriceRule, ProductInput, ProductListQuery, ReviewListQuery, Role, RoleInput, SearchHit, Settings, StatusChange,
  Subscriber, SubscriberListQuery, VariantListQuery, VariantRow, VariantUpdate,
} from '../types';

export interface SystemInfo {
  env: string;
  version: string;
  database: string;
  email: 'brevo' | 'disabled';
  emailFrom: string;
  paypal: 'sandbox' | 'live' | 'not configured';
  storefrontUrl: string;
  counts: { products: number; orders: number; reviews: number; enquiries: number; subscribers: number; admins: number };
  lastOrderAt: string | null;
  uptimeSeconds: number;
  time: string;
}

export interface AuthSession {
  token: string;
  user: AdminUser;
  role: Role;
}

/** Everything the admin panel can do. Implemented by the mock adapter and the HTTP adapter. */
export interface AdminApi {
  // auth
  requestOtp(email: string): Promise<{ ok: true }>;
  verifyOtp(email: string, code: string): Promise<AuthSession>;
  me(): Promise<{ user: AdminUser; role: Role } | null>;
  logout(): Promise<void>;

  // dashboard & search
  getDashboard(range: DashboardRange): Promise<DashboardStats>;
  search(term: string): Promise<SearchHit[]>;

  // products & inventory
  listProducts(q: ProductListQuery): Promise<Paged<AdminProduct>>;
  getProduct(id: string): Promise<AdminProduct | null>;
  createProduct(input: ProductInput): Promise<AdminProduct>;
  updateProduct(id: string, patch: Partial<ProductInput>): Promise<AdminProduct>;
  deleteProduct(id: string): Promise<void>;
  listVariants(q: VariantListQuery): Promise<Paged<VariantRow> & { summary: { inStock: number; low: number; out: number; units: number; value: number } }>;
  updateVariants(updates: VariantUpdate[]): Promise<{ updated: number }>;
  previewPriceRule(rule: PriceRule): Promise<{ affected: number; sampleBefore: number; sampleAfter: number }>;
  applyPriceRule(rule: PriceRule): Promise<{ affected: number }>;
  listSeries(): Promise<Array<{ brand: string; series: string; count: number }>>;

  // orders
  listOrders(q: OrderListQuery): Promise<Paged<AdminOrder>>;
  getOrder(orderNumber: string): Promise<AdminOrder | null>;
  changeOrderStatus(orderNumber: string, change: StatusChange): Promise<AdminOrder>;
  addOrderNote(orderNumber: string, note: string): Promise<AdminOrder>;
  setOrderTracking(orderNumber: string, tracking: { carrier: string; number: string; url?: string }): Promise<AdminOrder>;
  refundOrder(orderNumber: string, amount: number, reason: string): Promise<AdminOrder>;
  resendOrderEmail(orderNumber: string, kind: 'confirmation' | 'dispatched' | 'invoice'): Promise<AdminOrder>;
  flagOrder(orderNumber: string, flagged: boolean): Promise<AdminOrder>;
  updateOrderCustomer(orderNumber: string, customer: AdminOrder['customer']): Promise<AdminOrder>;

  // customers
  listCustomers(q: CustomerListQuery): Promise<Paged<Customer>>;
  getCustomer(id: string): Promise<{ customer: Customer; orders: AdminOrder[]; reviews: AdminReview[]; enquiries: Enquiry[] } | null>;
  updateCustomerNotes(id: string, notes: string): Promise<Customer>;

  // reviews
  listReviews(q: ReviewListQuery): Promise<Paged<AdminReview> & { counts: Record<'pending' | 'approved' | 'rejected', number> }>;
  setReviewStatus(id: string, status: AdminReview['status']): Promise<AdminReview>;
  replyToReview(id: string, reply: string): Promise<AdminReview>;
  deleteReview(id: string): Promise<void>;

  // enquiries & newsletter
  listEnquiries(q: EnquiryListQuery): Promise<Paged<Enquiry> & { counts: Record<'open' | 'replied' | 'closed', number> }>;
  updateEnquiry(id: string, patch: Partial<Pick<Enquiry, 'status' | 'reply' | 'assignee'>>): Promise<Enquiry>;
  listSubscribers(q: SubscriberListQuery): Promise<Paged<Subscriber> & { counts: Record<'subscribed' | 'unsubscribed', number> }>;
  addSubscriber(email: string): Promise<Subscriber>;
  setSubscriberStatus(id: string, status: Subscriber['status']): Promise<Subscriber>;
  deleteSubscriber(id: string): Promise<void>;

  // settings, admins, activity
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  listAdmins(): Promise<AdminUser[]>;
  addAdmin(input: Pick<AdminUser, 'email' | 'name' | 'roleId'>): Promise<AdminUser>;
  updateAdmin(id: string, patch: Partial<Pick<AdminUser, 'name' | 'roleId' | 'status'>>): Promise<AdminUser>;
  removeAdmin(id: string): Promise<void>;
  listRoles(): Promise<Array<Role & { members: number }>>;
  createRole(input: RoleInput): Promise<Role>;
  updateRole(id: string, patch: Partial<RoleInput>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  listActivity(q: ActivityQuery): Promise<Paged<ActivityEntry>>;

  // system
  getSystem(): Promise<SystemInfo>;
}
