import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { LockKeyhole } from 'lucide-react';
import { OrderItems } from '../../components/orders/OrderItems';
import { PaymentStep } from '../../components/orders/PaymentStep';
import { ShopHeader } from '../../components/shop/ShopHeader';
import { Button } from '../../components/ui/Button';
import { ErrorState, PageLoader } from '../../components/ui/Feedback';
import { Input, Textarea } from '../../components/ui/Field';
import { useCart } from '../../hooks/useCart';
import { useRememberShop } from '../../hooks/useCurrentShop';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useToast } from '../../hooks/useToast';
import { businessService } from '../../services/businessService';
import { customerOrderService } from '../../services/orderService';

export default function CheckoutPage() {
  const cart = useCart();
  const { customer, token, handleAuthError } = useCustomerAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: '',
    area: '',
    city: '',
    pincode: '',
    note: '',
  });
  // Payment step state: PENDING until the customer confirms "I have paid" with a reference.
  const [payment, setPayment] = useState({ status: 'PENDING', reference: '', screenshot: '' });
  const paymentSubmitted = payment.status === 'SUBMITTED';
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const loaded = useRef(false);
  useRememberShop(shop);

  // Fresh shop details: payment QR + current prices.
  useEffect(() => {
    if (!cart.business || loaded.current) return;
    loaded.current = true;
    businessService
      .getStore(cart.business.slug)
      .then(({ business, products: list }) => {
        const { missing } = cart.resolve(list);
        if (missing.length) {
          cart.prune(missing);
          toast.error('Some items are no longer available and were removed from your cart.');
        }
        setProducts(list);
        setShop(business);
      })
      .catch(setLoadError);
  }, [cart, toast]);

  if (!cart.items.length && !placing) return <Navigate to="/cart" replace />;
  const { lines, subtotal } = cart.resolve(products);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function placeOrder(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (form.phone.replace(/\D/g, '').length < 8) next.phone = 'Enter a valid phone number with country code';
    if (form.address.trim().length < 5) next.address = 'Enter your house / street address';
    if (form.area.trim().length < 2) next.area = 'Enter your area / locality';
    if (form.city.trim().length < 2) next.city = 'Enter your city';
    if (!/^[1-9]\d{5}$/.test(form.pincode.replace(/\s/g, ''))) next.pincode = 'Enter a valid 6-digit pincode';
    if (!lines.length) next.cart = 'Your cart is empty';
    setErrors(next);
    if (Object.keys(next).length) return toast.error('Please check the highlighted fields');
    if (!paymentSubmitted) return toast.error('Complete the payment step first');

    setPlacing(true);
    try {
      const order = await customerOrderService.create(token, {
        businessId: cart.business._id,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        delivery: {
          name: form.name.trim(),
          phone: form.phone,
          address: form.address.trim(),
          area: form.area.trim(),
          city: form.city.trim(),
          pincode: form.pincode.replace(/\s/g, ''),
        },
        note: form.note.trim(),
        payment: { status: payment.status, reference: payment.reference, screenshot: payment.screenshot },
      });
      cart.clear();
      navigate(`/my-orders/${order._id}?placed=1`, { replace: true });
    } catch (err) {
      setPlacing(false);
      if (handleAuthError(err)) return navigate('/login?next=/checkout');
      toast.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <ShopHeader shop={shop || undefined} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        {loadError ? (
          <ErrorState error={loadError} onRetry={() => window.location.reload()} />
        ) : !shop ? (
          <PageLoader label="Preparing checkout…" />
        ) : !shop.acceptingOrders ? (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This shop isn’t accepting online orders right now.</p>
        ) : (
          <form onSubmit={placeOrder} noValidate className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h2 className="mb-4 font-semibold">1. Customer details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full name" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
                  <Input label="Phone number" required type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} hint="With country code" />
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h2 className="mb-4 font-semibold">2. Delivery address</h2>
                <div className="space-y-4">
                  <Input label="Address" required autoComplete="address-line1" value={form.address} onChange={set('address')} error={errors.address} maxLength={500} placeholder="House / flat no., street" />
                  <Input label="Area" required autoComplete="address-line2" value={form.area} onChange={set('area')} error={errors.area} maxLength={120} placeholder="Area / locality / landmark" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="City" required autoComplete="address-level2" value={form.city} onChange={set('city')} error={errors.city} maxLength={80} />
                    <Input label="Pincode" required inputMode="numeric" autoComplete="postal-code" value={form.pincode} onChange={set('pincode')} error={errors.pincode} maxLength={7} placeholder="6 digits" />
                  </div>
                  <Input label="Note for the shop (optional)" value={form.note} onChange={set('note')} maxLength={500} placeholder="e.g. size, colour, delivery time" />
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">3. Payment · UPI</h2>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">Manual payment · verified by the shop</span>
                </div>
                <p className="mt-1 mb-4 text-sm text-neutral-500">
                  Pay {shop.payment ? shop.name : 'using the demo details below'}, then click <span className="font-medium">I have paid</span> and enter the payment reference.
                </p>
                <PaymentStep payment={shop.payment} demo={!shop.payment} amount={subtotal} note={`${shop.name} order`} value={payment} onChange={setPayment} />
              </section>
            </div>

            <aside className="lg:col-span-2">
              <div className="sticky top-20 rounded-2xl border border-neutral-200 bg-white p-5">
                <h2 className="mb-2 font-semibold">Order summary</h2>
                <p className="mb-2 text-sm text-neutral-500">{shop.name}</p>
                <OrderItems items={lines} total={subtotal} />
                <Button type="submit" size="lg" className="mt-5 w-full" loading={placing} disabled={!paymentSubmitted}>Place order</Button>
                {!paymentSubmitted && <p className="mt-2 text-center text-xs text-amber-700">Complete the payment step to place your order.</p>}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <LockKeyhole className="size-3.5" /> Ordering as {customer.name}
                </p>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
