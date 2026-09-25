import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { ArrowLeftRight, ExternalLink, LayoutDashboard, Menu, MessageCircle, Package, QrCode, Settings, ShoppingBag, Store, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { BusinessAvatar } from '../components/BusinessAvatar';
import { WhatsAppStatus } from '../components/WhatsAppStatus';
import { ErrorState, PageLoader } from '../components/ui/Feedback';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { cn } from '../utils/cn';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/store', label: 'Store', icon: Store },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/dashboard/payments', label: 'Payments', icon: QrCode },
  { to: '/dashboard/inbox', label: 'WhatsApp Inbox', icon: MessageCircle },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ business, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo to="/dashboard" />
      </div>

      <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5">
        <BusinessAvatar name={business.name} logo={business.logo} className="size-9 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{business.name}</div>
          <div className="truncate text-xs text-neutral-500">/store/{business.slug}</div>
        </div>
        <NavLink to="/businesses" title="Switch business" className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
          <ArrowLeftRight className="size-4" />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
        {business.store?.published && (
          <a
            href={`/store/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ExternalLink className="size-4" />
            Open Store
          </a>
        )}
      </nav>

      <NavLink
        to="/dashboard/whatsapp"
        onClick={onNavigate}
        className="m-3 block rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-300"
      >
        <div className="text-xs font-medium tracking-wide text-neutral-500 uppercase">WhatsApp</div>
        <WhatsAppStatus connected={business.whatsapp?.connected} className="mt-1 font-medium" />
      </NavLink>
    </div>
  );
}

export function DashboardLayout() {
  const { businessId, business, loading, error, refresh } = useCurrentBusiness();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isInbox = location.pathname.startsWith('/dashboard/inbox');

  if (!businessId) return <Navigate to="/businesses" replace />;
  if (loading && !business) return <PageLoader label="Loading your business…" />;
  if (error && !business) return <ErrorState error={error} onRetry={refresh} className="min-h-screen" />;
  if (!business) return <Navigate to="/businesses" replace />;

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-neutral-200 bg-neutral-50 lg:block">
        <Sidebar business={business} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-neutral-900/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-neutral-200 bg-neutral-50 shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Close menu">
              <X className="size-5" />
            </button>
            <Sidebar business={business} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="truncate font-semibold">{business.name}</span>
        </header>
        <main className={cn(isInbox ? '' : 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
