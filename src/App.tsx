import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/auth';
import { ToastProvider } from './store/toast';
import { AdminLayout } from './components/layout/AdminLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ROUTE_PERMISSION } from './lib/permissions';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NoAccess from './pages/NoAccess';

const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Products = lazy(() => import('./pages/Products'));
const ProductEdit = lazy(() => import('./pages/ProductEdit'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Enquiries = lazy(() => import('./pages/Enquiries'));
const Subscribers = lazy(() => import('./pages/Subscribers'));
const Settings = lazy(() => import('./pages/Settings'));
const Team = lazy(() => import('./pages/Team'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, offline, retry } = useAuth();
  const location = useLocation();
  if (offline) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-xl font-bold">Cannot reach the BuyUpon server</p>
        <p className="max-w-sm text-sm text-ink-3">The admin could not contact the backend. Check that it is running and reachable, then try again.</p>
        <button onClick={retry} className="mt-2 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">Try again</button>
      </div>
    );
  }
  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-ink-3">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Hides a page the role has no permission for, falling back to the first page it can see. */
function Guarded({ children }: { children: ReactNode }) {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const rule = ROUTE_PERMISSION.find((r) => (r.prefix === '/' ? pathname === '/' : pathname.startsWith(r.prefix)));
  if (rule && !can(rule.permission)) {
    if (pathname === '/') {
      const first = ROUTE_PERMISSION.find((r) => r.prefix !== '/' && can(r.permission));
      if (first) return <Navigate to={first.prefix} replace />;
    }
    return <NoAccess />;
  }
  return <>{children}</>;
}

function Fallback() {
  return <div className="py-24 text-center text-sm text-ink-3">Loading…</div>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
                <Route index element={<Guarded><Dashboard /></Guarded>} />
                <Route path="orders" element={<Guarded><Orders /></Guarded>} />
                <Route path="orders/:orderNumber" element={<Guarded><OrderDetail /></Guarded>} />
                <Route path="products" element={<Guarded><Products /></Guarded>} />
                <Route path="products/new" element={<Guarded><ProductEdit /></Guarded>} />
                <Route path="products/:id" element={<Guarded><ProductEdit /></Guarded>} />
                <Route path="inventory" element={<Guarded><Inventory /></Guarded>} />
                <Route path="customers" element={<Guarded><Customers /></Guarded>} />
                <Route path="customers/:id" element={<Guarded><CustomerDetail /></Guarded>} />
                <Route path="reviews" element={<Guarded><Reviews /></Guarded>} />
                <Route path="enquiries" element={<Guarded><Enquiries /></Guarded>} />
                <Route path="subscribers" element={<Guarded><Subscribers /></Guarded>} />
                <Route path="team" element={<Guarded><Team /></Guarded>} />
                <Route path="settings" element={<Guarded><Settings /></Guarded>} />
                <Route path="activity" element={<Guarded><ActivityLog /></Guarded>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
