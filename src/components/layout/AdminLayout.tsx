import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Boxes, ExternalLink, LogOut, Mail, Menu as MenuIcon, MessageSquare, Package, Search, Settings, Shield, Smartphone, Star, Users, X, UserCog } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { cn } from '../../lib/cn';
import { STOREFRONT_URL } from '../../lib/format';
import { CommandSearch } from './CommandSearch';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Avatar, Menu } from '../ui/Misc';
import { RoleBadge } from '../ui/Badge';
import type { Permission } from '../../types';

const NAV: Array<{ to: string; label: string; icon: typeof BarChart3; end?: boolean; permission: Permission; group?: string }> = [
  { to: '/', label: 'Dashboard', icon: BarChart3, end: true, permission: 'dashboard.view' },
  { to: '/orders', label: 'Orders', icon: Package, permission: 'orders.view', group: 'Sell' },
  { to: '/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { to: '/products', label: 'Products', icon: Smartphone, permission: 'products.view', group: 'Catalogue' },
  { to: '/inventory', label: 'Inventory & pricing', icon: Boxes, permission: 'products.view' },
  { to: '/reviews', label: 'Reviews', icon: Star, permission: 'reviews.manage', group: 'Engage' },
  { to: '/enquiries', label: 'Enquiries', icon: MessageSquare, permission: 'enquiries.manage' },
  { to: '/subscribers', label: 'Newsletter', icon: Mail, permission: 'subscribers.manage' },
  { to: '/team', label: 'Team & roles', icon: UserCog, permission: 'team.view', group: 'Manage' },
  { to: '/activity', label: 'Activity log', icon: Activity, permission: 'activity.view' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
];

export function AdminLayout() {
  const { user, role, signOut, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const items = NAV.filter((n) => can(n.permission));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/brand/cmm-logo.png" alt="CashMyMobile" className="h-6 w-auto" />
          <span className="whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">Buy admin</span>
        </Link>
        <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-ink-3 hover:bg-cream lg:hidden" aria-label="Close menu"><X size={18} /></button>
      </div>
      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map(({ to, label, icon: Icon, end, group }) => (
          <div key={to}>
            {group && <p className="mb-1 mt-4 px-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-4 first:mt-0">{group}</p>}
            <NavLink to={to} end={end} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
              <Icon size={17} strokeWidth={2.2} />
              {label}
            </NavLink>
          </div>
        ))}
      </nav>
      <div className="space-y-2 px-3 pb-4 pt-3">
        <a href={STOREFRONT_URL} target="_blank" rel="noreferrer" className="nav-item text-ink-3">
          <ExternalLink size={16} /> Open storefront
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {open && <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-[248px] border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-cream-2/85 px-4 backdrop-blur-xl md:px-7">
          <button onClick={() => setOpen(true)} className="rounded-full p-2 text-ink-2 hover:bg-cream lg:hidden" aria-label="Open menu"><MenuIcon size={20} /></button>
          <button onClick={() => setSearch(true)} className="flex h-9 flex-1 items-center gap-2.5 rounded-full border border-line bg-white px-3.5 text-left text-[13px] text-ink-3 transition-colors hover:border-ink sm:max-w-md">
            <Search size={14} />
            <span className="flex-1">Search orders, products, customers…</span>
            <span className="hidden items-center gap-1 sm:flex"><span className="kbd">⌘</span><span className="kbd">K</span></span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {user && role && (
              <Menu
                align="right"
                trigger={
                  <button className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-3 transition-colors hover:border-ink">
                    <Avatar name={user.name} size="sm" />
                    <span className="hidden text-left sm:block">
                      <span className="block text-[13px] font-bold leading-tight">{user.name}</span>
                      <span className="block text-[10.5px] leading-tight text-ink-3">{role.name}</span>
                    </span>
                  </button>
                }
                header={
                  <div className="px-3 py-2">
                    <p className="truncate text-[13px] font-bold">{user.email}</p>
                    <div className="mt-1"><RoleBadge role={role} /></div>
                  </div>
                }
                items={[
                  ...(can('team.view') ? [{ label: 'Team & roles', icon: <Shield size={14} />, onClick: () => navigate('/team') }] : []),
                  ...(can('settings.view') ? [{ label: 'Settings', icon: <Settings size={14} />, onClick: () => navigate('/settings') }] : []),
                  'divider' as const,
                  { label: 'Sign out', icon: <LogOut size={14} />, onClick: () => void signOut(), danger: true },
                ]}
              />
            )}
          </div>
        </header>
        <main className="flex-1 px-4 py-5 md:px-7 md:py-6">
          <div key={location.pathname} className="mx-auto max-w-[1480px] animate-page">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <CommandSearch open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
