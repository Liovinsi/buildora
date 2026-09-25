import { Link, NavLink, useNavigate } from 'react-router';
import { LogOut, Package, ShoppingCart, Store, UserRound } from 'lucide-react';
import { BusinessAvatar } from '../BusinessAvatar';
import { Logo } from '../Logo';
import { useCart } from '../../hooks/useCart';
import { useCurrentShop } from '../../hooks/useCurrentShop';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { cn } from '../../utils/cn';
import { storePath } from '../../utils/shopPaths';
import { DemoBadge } from './DemoBadge';

const navItem = ({ isActive }) =>
  cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium hover:bg-neutral-100', isActive ? 'text-neutral-900' : 'text-neutral-600');

// Header for customer-facing pages: [Business logo + name] [Shop] [My Orders] [Cart] [Customer] [Logout].
// The business is the page's own (`shop` prop), else the shop the customer is browsing, else the cart's shop.
export function ShopHeader({ shop }) {
  const cart = useCart();
  const { shop: currentShop } = useCurrentShop();
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const current = shop || currentShop || cart.business;
  const home = current ? storePath(current.slug) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        {current ? (
          <Link to={home} className="flex min-w-0 items-center gap-2" aria-label={current.name}>
            <BusinessAvatar name={current.name} logo={current.logo} className="size-8 shrink-0 text-xs" />
            <span className="truncate font-semibold">{current.name}</span>
          </Link>
        ) : (
          <Logo />
        )}
        <nav className="ml-auto flex shrink-0 items-center gap-0.5 text-sm whitespace-nowrap">
          {home && (
            <NavLink to={home} end className={navItem} aria-label="Shop">
              <Store className="size-4" /> <span className="hidden sm:inline">Shop</span>
            </NavLink>
          )}
          {customer && (
            <NavLink to="/my-orders" className={navItem} aria-label="My Orders">
              <Package className="size-4" /> <span className="hidden sm:inline">My Orders</span>
            </NavLink>
          )}
          <NavLink to="/cart" className={navItem} aria-label={`Cart, ${cart.count} items`}>
            <ShoppingCart className="size-4" /> Cart ({cart.count})
          </NavLink>
          {customer ? (
            <div className="ml-1 flex items-center gap-2 border-l border-neutral-200 pl-3">
              <span className="hidden items-center gap-1.5 text-neutral-700 md:inline-flex">
                <UserRound className="size-4 text-neutral-400" /> {customer.name}
              </span>
              <DemoBadge className="hidden lg:inline-flex" />
              <button
                onClick={async () => {
                  await logout();
                  navigate(home || '/login');
                }}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="size-4" /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={(s) => cn(navItem(s), 'ml-1')}>
              <UserRound className="size-4" /> Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
