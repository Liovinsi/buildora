import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ImageOff, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ShopHeader } from '../../components/shop/ShopHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState, Spinner } from '../../components/ui/Feedback';
import { MAX_QTY, MIN_QTY, useCart } from '../../hooks/useCart';
import { useRememberShop } from '../../hooks/useCurrentShop';
import { useToast } from '../../hooks/useToast';
import { businessService } from '../../services/businessService';
import { formatPrice } from '../../utils/format';
import { storePath } from '../../utils/shopPaths';

export default function CartPage() {
  const cart = useCart();
  const toast = useToast();
  const [shop, setShop] = useState(null); // current business info (is it still accepting orders?)
  const [products, setProducts] = useState([]);
  const [checking, setChecking] = useState(Boolean(cart.business));
  const loaded = useRef(false);
  useRememberShop(shop?._id ? shop : null);

  // Names, prices and images come from the shop's current products.
  useEffect(() => {
    if (!cart.business || loaded.current) return;
    loaded.current = true;
    businessService
      .getStore(cart.business.slug)
      .then(({ business, products: list }) => {
        setShop(business);
        setProducts(list);
        const { missing } = cart.resolve(list);
        if (missing.length) {
          cart.prune(missing);
          toast.error(`${missing.length} item${missing.length > 1 ? 's are' : ' is'} no longer available and ${missing.length > 1 ? 'were' : 'was'} removed from your cart.`);
        }
      })
      .catch(() => setShop({ acceptingOrders: false }))
      .finally(() => setChecking(false));
  }, [cart, toast]);

  const { lines, subtotal } = cart.resolve(products);

  return (
    <div className="min-h-screen bg-neutral-50">
      <ShopHeader shop={shop?._id ? shop : undefined} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        {cart.business && <p className="mt-1 text-sm text-neutral-500">From {cart.business.name}</p>}

        {!cart.items.length ? (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white">
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Browse a shop and add products to your cart."
              action={cart.business && <Button variant="secondary" to={storePath(cart.business.slug)}>Continue shopping</Button>}
            />
          </div>
        ) : checking ? (
          <div className="mt-10 flex justify-center"><Spinner className="size-6" /></div>
        ) : (
          <div className="mt-6 space-y-4">
            <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
              {lines.map((item) => (
                <li key={item.productId} className="flex items-center gap-3 p-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-neutral-300"><ImageOff className="size-5" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="text-sm text-neutral-500">{formatPrice(item.price)}</div>
                    <div className="mt-2 inline-flex items-center rounded-lg border border-neutral-200">
                      <button onClick={() => cart.setQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= MIN_QTY} className="p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30" aria-label={`Decrease ${item.name}`}><Minus className="size-3.5" /></button>
                      <span className="min-w-8 text-center text-sm font-medium" aria-label="Quantity">{item.quantity}</span>
                      <button onClick={() => cart.setQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= MAX_QTY} className="p-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30" aria-label={`Increase ${item.name}`}><Plus className="size-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                    <button onClick={() => cart.remove(item.productId)} className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {shop && !shop.acceptingOrders && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This shop isn’t accepting online orders right now.</p>
              )}
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" to={storePath(cart.business.slug)}>Continue shopping</Button>
                <Button to={shop?.acceptingOrders ? '/checkout' : undefined} disabled={!shop?.acceptingOrders}>
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
        {cart.items.length > 0 && (
          <p className="mt-4 text-center text-xs text-neutral-500">
            <Link to={storePath(cart.business.slug)} className="hover:underline">← Back to {cart.business.name}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
