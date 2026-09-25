import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/orders/OrderBadges';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { useApi } from '../hooks/useApi';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { ownerOrderService } from '../services/orderService';
import { cn } from '../utils/cn';
import { formatPhone, formatPrice } from '../utils/format';
import { ORDER_STATUS, formatOrderDate, itemCount } from '../utils/orders';

const FILTERS = ['ALL', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export default function OrdersPage() {
  const { business } = useCurrentBusiness();
  const [filter, setFilter] = useState('ALL');
  const load = useCallback(
    () => ownerOrderService.list(business._id, filter === 'ALL' ? undefined : { status: filter }),
    [business._id, filter]
  );
  const { data: orders, loading, error, reload } = useApi(load, [load]);
  const paymentReady = Boolean(business.payment?.upiId || business.payment?.qrImage);

  return (
    <>
      <PageHeader title="Orders" description="Orders placed on your shop. Update the status as you process them." />

      {!paymentReady && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>Customers can place orders, but can’t pay until you add your UPI ID or payment QR. Their orders stay “Payment pending”.</span>
          <Button size="sm" variant="secondary" to="/dashboard/payments">Set up payments</Button>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-sm font-medium',
              filter === f ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            )}
          >
            {f === 'ALL' ? 'All' : ORDER_STATUS[f].label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !orders.length ? (
          <EmptyState
            icon={ShoppingBag}
            title={filter === 'ALL' ? 'No orders yet' : `No ${ORDER_STATUS[filter].label.toLowerCase()} orders`}
            description={filter === 'ALL' ? 'When customers order from your shop, they will appear here.' : undefined}
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {orders.map((o) => (
              <li key={o._id}>
                <Link to={`/dashboard/orders/${o._id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 sm:px-5">
                  <div className="w-16 shrink-0 font-semibold">#{o.orderNumber}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{o.delivery.name}</div>
                    <div className="truncate text-sm text-neutral-500">
                      {formatPhone(o.delivery.phone)} · {itemCount(o)} item{itemCount(o) > 1 ? 's' : ''} · {formatOrderDate(o.createdAt)}
                    </div>
                  </div>
                  <div className="hidden flex-col items-end gap-1 sm:flex">
                    <OrderStatusBadge status={o.status} />
                    <PaymentStatusBadge status={o.payment.status} />
                  </div>
                  <div className="w-20 text-right font-semibold">{formatPrice(o.total)}</div>
                  <ChevronRight className="size-4 shrink-0 text-neutral-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
