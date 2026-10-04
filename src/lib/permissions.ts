import type { Permission } from '../types';

export interface PermissionDef {
  key: Permission;
  label: string;
  description: string;
}
export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionDef[];
}

/** Every permission the admin understands, grouped by feature. Roles are sets of these keys. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: 'dashboard', label: 'Dashboard', items: [{ key: 'dashboard.view', label: 'View dashboard', description: 'Revenue, orders and stock overview' }] },
  {
    key: 'orders',
    label: 'Orders',
    items: [
      { key: 'orders.view', label: 'View orders', description: 'Open the orders list and order pages' },
      { key: 'orders.manage', label: 'Fulfil orders', description: 'Change status, add tracking, notes, edit delivery details, re-send emails' },
      { key: 'orders.refund', label: 'Refund and cancel', description: 'Issue refunds, cancel or mark orders returned' },
      { key: 'orders.export', label: 'Export orders', description: 'Download order CSVs' },
    ],
  },
  {
    key: 'products',
    label: 'Catalogue',
    items: [
      { key: 'products.view', label: 'View products', description: 'Browse products, variants and inventory' },
      { key: 'products.edit', label: 'Edit products', description: 'Create and edit products, specs, images, status and featured' },
      { key: 'products.delete', label: 'Delete products', description: 'Delete or archive products' },
      { key: 'inventory.edit', label: 'Edit stock and prices', description: 'Change individual variant stock and prices' },
      { key: 'pricing.rules', label: 'Bulk price rules', description: 'Apply percentage or fixed changes across many variants' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    items: [
      { key: 'customers.view', label: 'View customers', description: 'Customer list, order history and contact details' },
      { key: 'customers.edit', label: 'Edit customer notes', description: 'Add internal notes to customers' },
    ],
  },
  {
    key: 'engagement',
    label: 'Reviews, enquiries and newsletter',
    items: [
      { key: 'reviews.manage', label: 'Moderate reviews', description: 'Approve, hide, reply to and delete reviews' },
      { key: 'enquiries.manage', label: 'Handle enquiries', description: 'Read and reply to contact form messages' },
      { key: 'subscribers.manage', label: 'Manage newsletter', description: 'View, add, unsubscribe and export subscribers' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings and team',
    items: [
      { key: 'settings.view', label: 'View settings', description: 'See store, delivery, catalogue and payment settings' },
      { key: 'settings.edit', label: 'Edit settings', description: 'Change store, delivery, catalogue, featured, payment and notification settings' },
      { key: 'team.view', label: 'View team', description: 'See admins and roles' },
      { key: 'team.manage', label: 'Manage team and roles', description: 'Invite and remove admins, create roles, assign permissions' },
      { key: 'activity.view', label: 'View activity log', description: 'Audit trail of admin actions' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
export const PERMISSION_LABEL: Record<Permission, string> = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label]))) as Record<Permission, string>;

/** Which permission each route needs. */
export const ROUTE_PERMISSION: Array<{ prefix: string; permission: Permission }> = [
  { prefix: '/orders', permission: 'orders.view' },
  { prefix: '/products', permission: 'products.view' },
  { prefix: '/inventory', permission: 'products.view' },
  { prefix: '/customers', permission: 'customers.view' },
  { prefix: '/reviews', permission: 'reviews.manage' },
  { prefix: '/enquiries', permission: 'enquiries.manage' },
  { prefix: '/subscribers', permission: 'subscribers.manage' },
  { prefix: '/activity', permission: 'activity.view' },
  { prefix: '/team', permission: 'team.view' },
  { prefix: '/settings', permission: 'settings.view' },
  { prefix: '/', permission: 'dashboard.view' },
];
