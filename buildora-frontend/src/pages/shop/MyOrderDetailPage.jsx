import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/orders/OrderBadges';
import { OrderItems } from '../../components/orders/OrderItems';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { PaymentNotConfigured } from '../../components/orders/PaymentQrCard';
import { PaymentStep } from '../../components/orders/PaymentStep';
import { ShopHeader } from '../../components/shop/ShopHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { useApi } from '../../hooks/useApi';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useRememberShop } from '../../hooks/useCurrentShop';
import { useToast } from '../../hooks/useToast';
import { customerOrderService } from '../../services/orderService';
import { formatPhone, formatPrice } from '../../utils/format';
import { addressLines, formatOrderDate } from '../../utils/orders';
import { whatsappLink } from '../../utils/whatsapp';
import { storePath } from '../../utils/shopPaths';

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function OrderPlaced({ order }) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <h2 className="text-xl font-semibold text-emerald-900">Order placed successfully 🎉</h2>
      <p className="mt-1 text-sm text-emerald-800">{order.business?.name} will confirm your order shortly.</p>
      <dl className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-3 text-left sm:grid-cols-4">
        {[
          ['Order ID', `#${order.orderNumber}`],
          ['Total', formatPrice(order.total)],
          ['Payment', <PaymentStatusBadge key="p" status={order.payment.status} />],
          ['Order status', <OrderStatusBadge key="o" status={order.status} />],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-3">
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button to="/my-orders">View My Orders</Button>
        {order.business?.slug && <Button variant="secondary" to={storePath(order.business.slug)}>Continue Shopping</Button>}
      </div>
    </div>
  );
}

// Resubmit after a rejection (or pay a legacy pending order): same "I have paid" step as checkout.
function SubmitPayment({ order, onSubmitted }) {
  const { token } = useCustomerAuth();
  const toast = useToast();
  const [value, setValue] = useState({ status: 'PENDING', reference: '', screenshot: '' });
  const [busy, setBusy] = useState(false);

  async function handleChange(next) {
    if (next.status !== 'SUBMITTED') return setValue(next);
    setBusy(true);
    try {
      onSubmitted(await customerOrderService.submitPayment(token, order._id, { reference: next.reference, screenshot: next.screenshot }));
      toast.success('Payment details sent to the shop');
    } catch (err) {
      toast.error(err);
      setValue({ ...next, status: 'PENDING' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={busy ? 'pointer-events-none mt-4 opacity-60' : 'mt-4'}>
      <PaymentStep payment={order.businessPayment} demo={order.payment.method === 'UPI_DEMO'} amount={order.total} note={`Order #${order.orderNumber}`} value={value} onChange={handleChange} />
    </div>
  );
}

export default function MyOrderDetailPage() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const { token, handleAuthError } = useCustomerAuth();
  const navigate = useNavigate();
  const load = useCallback(() => customerOrderService.get(token, orderId), [token, orderId]);
  const { data: order, loading, error, reload, setData } = useApi(load, [load]);
  useRememberShop(order?.business);

  useEffect(() => {
    if (error && handleAuthError(error)) navigate(`/login?next=/my-orders/${orderId}`, { replace: true });
  }, [error, handleAuthError, navigate, orderId]);

  const canPay = order && order.status !== 'CANCELLED' && ['PENDING', 'REJECTED'].includes(order.payment.status);

  return (
    <div className="min-h-screen bg-neutral-50">
      <ShopHeader shop={order?.business} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link to="/my-orders" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="size-4" /> My Orders
        </Link>

        {loading ? (
          <PageLoader label="Loading order…" />
        ) : error ? (
          error.status === 404 ? <EmptyState title="Order not found" description="This order doesn’t exist or belongs to another account." /> : <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            {params.get('placed') && <OrderPlaced order={order} />}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Order #{order.orderNumber}</h1>
                <p className="text-sm text-neutral-500">{order.business?.name} · {formatOrderDate(order.createdAt)}</p>
              </div>
              <div className="flex gap-1.5">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.payment.status} />
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <div className="space-y-6 lg:col-span-3">
                <Section title="Items">
                  <OrderItems items={order.items} total={order.total} />
                </Section>

                <Section title="Payment">
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <PaymentStatusBadge status={order.payment.status} />
                      <span className="text-xs text-neutral-500">{order.payment.method === 'UPI_DEMO' ? 'Demo payment · no real money' : 'Manual UPI payment'}</span>
                    </div>
                    {order.payment.reference && <div className="text-neutral-600">Reference: <span className="font-medium text-neutral-900">{order.payment.reference}</span></div>}
                    {order.payment.status === 'SUBMITTED' && <p className="text-neutral-500">Awaiting verification: the shop checks each payment manually.</p>}
                    {order.payment.status === 'VERIFIED' && <p className="text-emerald-700">The shop marked your payment as verified.</p>}
                    {order.payment.status === 'REJECTED' && (
                      <p className="text-red-700">The shop couldn’t find this payment{order.payment.rejectionReason ? `: ${order.payment.rejectionReason}` : '.'} Please check and submit again.</p>
                    )}
                    {order.payment.status === 'PENDING' && order.businessPayment && <p className="text-neutral-600">Pay using the QR code below, then submit the reference.</p>}
                  </div>
                  {order.payment.screenshot && <img src={order.payment.screenshot} alt="Your payment screenshot" className="mt-3 max-h-48 rounded-lg border border-neutral-200" />}
                  {canPay && (order.businessPayment || order.payment.method === 'UPI_DEMO') && <SubmitPayment order={order} onSubmitted={setData} />}
                  {canPay && !order.businessPayment && order.payment.method !== 'UPI_DEMO' && (
                    <div className="mt-4">
                      <PaymentNotConfigured>The shop hasn’t added its UPI details yet. Check back here to pay, or ask the shop on WhatsApp.</PaymentNotConfigured>
                    </div>
                  )}
                </Section>
              </div>

              <div className="space-y-6 lg:col-span-2">
                <Section title="Status">
                  <OrderTimeline order={order} />
                </Section>
                <Section title="Delivery">
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{order.delivery.name}</div>
                    <div className="text-neutral-600">{formatPhone(order.delivery.phone)}</div>
                    {addressLines(order.delivery).map((line) => <div key={line} className="text-neutral-600">{line}</div>)}
                    {order.note && <div className="pt-2 text-neutral-500">Note: {order.note}</div>}
                  </div>
                </Section>
                {order.business?.phone && (
                  <a
                    href={whatsappLink(order.business.phone, `Hi ${order.business.name}, about my order #${order.orderNumber}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-medium text-whatsapp-dark hover:bg-neutral-50"
                  >
                    <MessageCircle className="size-4" /> Ask {order.business.name} on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
