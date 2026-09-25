import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CircleCheck, CircleX, MessageCircle, Phone } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/orders/OrderBadges';
import { OrderItems } from '../components/orders/OrderItems';
import { OrderTimeline } from '../components/orders/OrderTimeline';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useApi } from '../hooks/useApi';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { ownerOrderService } from '../services/orderService';
import { formatPhone } from '../utils/format';
import { ORDER_STATUS, addressLines, formatOrderDate, nextStatuses } from '../utils/orders';
import { whatsappLink } from '../utils/whatsapp';

function StatusUpdater({ order, onUpdated }) {
  const { business } = useCurrentBusiness();
  const toast = useToast();
  const options = nextStatuses(order.status);
  const [status, setStatus] = useState(options[0] || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setStatus(nextStatuses(order.status)[0] || ''), [order.status]);

  if (!options.length) return <p className="text-sm text-neutral-500">This order is {ORDER_STATUS[order.status].label.toLowerCase()}. No further updates.</p>;

  async function update(e) {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdated(await ownerOrderService.updateStatus(business._id, order._id, { status, note: note.trim() }));
      setNote('');
      toast.success(`Order marked ${ORDER_STATUS[status].label.toLowerCase()}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={update} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">New status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm shadow-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
          {options.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
      </label>
      <Input label="Note for the customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={status === 'CANCELLED' ? 'Reason for cancelling' : 'e.g. Courier: DTDC 12345'} />
      <Button type="submit" loading={busy} variant={status === 'CANCELLED' ? 'danger' : 'primary'}>
        {status === 'CANCELLED' ? 'Cancel order' : `Mark as ${ORDER_STATUS[status]?.label.toLowerCase()}`}
      </Button>
    </form>
  );
}

function PaymentReview({ order, onUpdated }) {
  const { business } = useCurrentBusiness();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(null);
  const [zoom, setZoom] = useState(false);
  const p = order.payment;

  async function review(status) {
    setBusy(status);
    try {
      onUpdated(await ownerOrderService.reviewPayment(business._id, order._id, { status, reason: reason.trim() }));
      toast.success(status === 'VERIFIED' ? 'Payment verified' : 'Payment rejected');
      setRejecting(false);
      setReason('');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <PaymentStatusBadge status={p.status} />
        <span className="text-xs text-neutral-500">{p.method === 'UPI_DEMO' ? 'Demo payment' : 'Manual UPI'}</span>
      </div>
      {p.method === 'UPI_DEMO' && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
          Placed with the development demo payment block (your UPI details weren’t set up). No real money was transferred; verifying only marks it as reviewed.
        </p>
      )}
      {p.status === 'PENDING' && <p className="text-neutral-500">The customer hasn’t submitted payment details yet.</p>}
      {p.reference && <div>Reference: <span className="font-mono font-medium">{p.reference}</span></div>}
      {p.submittedAt && <div className="text-neutral-500">Submitted {formatOrderDate(p.submittedAt)}</div>}
      {p.status === 'REJECTED' && p.rejectionReason && <div className="text-red-700">Rejected: {p.rejectionReason}</div>}
      {p.screenshot && (
        <button type="button" onClick={() => setZoom(true)} className="block">
          <img src={p.screenshot} alt="Payment screenshot" className="max-h-40 rounded-lg border border-neutral-200" />
          <span className="text-xs text-brand-600">View full size</span>
        </button>
      )}
      {p.status === 'SUBMITTED' && (
        <>
          <p className="text-neutral-500">Check your UPI app for this payment, then confirm.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="whatsapp" loading={busy === 'VERIFIED'} disabled={Boolean(busy)} onClick={() => review('VERIFIED')}><CircleCheck className="size-4" /> Verify payment</Button>
            <Button size="sm" variant="danger" disabled={Boolean(busy)} onClick={() => setRejecting(true)}><CircleX className="size-4" /> Reject</Button>
          </div>
        </>
      )}
      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject payment?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button variant="danger" loading={busy === 'REJECTED'} onClick={() => review('REJECTED')}>Reject payment</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-neutral-600">The customer will be asked to check and submit their payment details again.</p>
        <Input label="Reason (shown to the customer)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. No payment received with this reference" />
      </Modal>
      <Modal open={zoom} onClose={() => setZoom(false)} title="Payment screenshot" size="lg">
        <img src={p.screenshot} alt="Payment screenshot" className="mx-auto max-h-[70vh]" />
      </Modal>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { business } = useCurrentBusiness();
  const load = useCallback(() => ownerOrderService.get(business._id, orderId), [business._id, orderId]);
  const { data: order, loading, error, reload, setData } = useApi(load, [load]);

  return (
    <>
      <Link to="/dashboard/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      {loading ? (
        <PageLoader />
      ) : error ? (
        error.status === 404 ? <EmptyState title="Order not found" description="This order doesn’t exist in this business." /> : <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Order #{order.orderNumber}</h1>
              <p className="text-sm text-neutral-500">Placed {formatOrderDate(order.createdAt)}</p>
            </div>
            <div className="flex gap-1.5">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment.status} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <Card>
                <CardHeader title="Items" />
                <div className="px-5 pb-4"><OrderItems items={order.items} total={order.total} /></div>
              </Card>
              <Card>
                <CardHeader title="Payment" description="Manual UPI payment. Verify it in your UPI app." />
                <div className="p-5"><PaymentReview order={order} onUpdated={setData} /></div>
              </Card>
              <Card>
                <CardHeader title="Customer & delivery" />
                <div className="space-y-1 p-5 text-sm">
                  <div className="font-medium">{order.delivery.name}</div>
                  <div className="text-neutral-600">{formatPhone(order.delivery.phone)}</div>
                  {addressLines(order.delivery).map((line) => <div key={line} className="text-neutral-600">{line}</div>)}
                  {order.note && <div className="pt-2"><span className="text-neutral-500">Customer note:</span> {order.note}</div>}
                  {order.customer && <div className="pt-2 text-xs text-neutral-500">Account: {order.customer.name} ({formatPhone(order.customer.phone)})</div>}
                  <div className="flex flex-wrap gap-2 pt-3">
                    <Button size="sm" variant="secondary" href={`tel:+${order.delivery.phone}`}><Phone className="size-4" /> Call</Button>
                    <Button size="sm" variant="secondary" href={whatsappLink(order.delivery.phone, `Hi ${order.delivery.name}, about your order #${order.orderNumber} from ${business.name}`)} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" /> WhatsApp
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader title="Update status" />
                <div className="p-5"><StatusUpdater order={order} onUpdated={setData} /></div>
              </Card>
              <Card>
                <CardHeader title="Timeline" />
                <div className="p-5"><OrderTimeline order={order} /></div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
