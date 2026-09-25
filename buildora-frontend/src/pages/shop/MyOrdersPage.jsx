import { useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, Package } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/orders/OrderBadges';
import { BusinessAvatar } from '../../components/BusinessAvatar';
import { ShopHeader } from '../../components/shop/ShopHeader';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { useApi } from '../../hooks/useApi';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useCurrentShop } from '../../hooks/useCurrentShop';
import { customerOrderService } from '../../services/orderService';
import { formatPrice } from '../../utils/format';
import { formatOrderDate, itemCount, productSummary } from '../../utils/orders';
import { storePath } from '../../utils/shopPaths';

export default function MyOrdersPage() {
  const { token, customer, handleAuthError } = useCustomerAuth();
  const { shop } = useCurrentShop();
  const navigate = useNavigate();
  const load = useCallback(() => customerOrderService.list(token), [token]);
  const { data: orders, loading, error, reload } = useApi(load, [load]);

  useEffect(() => {
    if (error && handleAuthError(error)) navigate('/login?next=/my-orders', { replace: true });
  }, [error, handleAuthError, navigate]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <ShopHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Orders</h1>
        <p className="mt-1 text-sm text-neutral-500">Orders placed as {customer?.name}</p>

        <div className="mt-6">
          {loading ? (
            <PageLoader label="Loading your orders…" />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !orders.length ? (
            <div className="rounded-2xl border border-neutral-200 bg-white">
              <EmptyState
                icon={Package}
                title="No orders yet"
                description="When you place an order, it will appear here with its status."
                action={shop && <Link to={storePath(shop.slug)} className="text-sm font-medium text-brand-600 hover:underline">Continue shopping →</Link>}
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o._id}>
                  <Link to={`/my-orders/${o._id}`} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
                    <BusinessAvatar name={o.business?.name || '?'} logo={o.business?.logo} className="size-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold">{o.business?.name}</span>
                        <span className="text-sm text-neutral-500">#{o.orderNumber}</span>
                      </div>
                      <div className="truncate text-sm text-neutral-700">{productSummary(o)}</div>
                      <div className="text-sm text-neutral-500">
                        {formatOrderDate(o.createdAt)} · {itemCount(o)} item{itemCount(o) > 1 ? 's' : ''} · <span className="font-medium text-neutral-900">{formatPrice(o.total)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <OrderStatusBadge status={o.status} />
                        <PaymentStatusBadge status={o.payment.status} />
                      </div>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 sm:inline-flex">
                      View Order <ChevronRight className="size-4" />
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-neutral-300 sm:hidden" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
