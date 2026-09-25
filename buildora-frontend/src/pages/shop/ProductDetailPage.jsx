import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ImageOff, MessageCircle, Minus, PackageOpen, Plus, ShoppingCart, Store } from 'lucide-react';
import { CartConflictModal } from '../../components/shop/CartConflictModal';
import { ShopHeader } from '../../components/shop/ShopHeader';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { useApi } from '../../hooks/useApi';
import { MAX_QTY, MIN_QTY, useCart } from '../../hooks/useCart';
import { useRememberShop } from '../../hooks/useCurrentShop';
import { useToast } from '../../hooks/useToast';
import { businessService } from '../../services/businessService';
import { formatPrice } from '../../utils/format';
import { storePath } from '../../utils/shopPaths';
import { productEnquiry, productUrl, whatsappLink } from '../../utils/whatsapp';

// Public product page: /store/:slug/product/:productId. Uses the public store endpoint, so only
// available products of a published shop are shown.
export default function ProductDetailPage() {
  const { slug, productId } = useParams();
  const { data, loading, error, reload } = useApi(() => businessService.getStore(slug), [slug]);
  const cart = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [conflict, setConflict] = useState(false);

  const business = data?.business;
  const product = useMemo(() => data?.products.find((p) => p._id === productId), [data, productId]);
  useRememberShop(business);

  useEffect(() => {
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (product && business) document.title = `${product.name} · ${business.name}`;
    return () => { document.title = 'Buildora'; };
  }, [product, business]);

  if (loading) return <PageLoader label="Loading product…" />;
  if (error) {
    return error.status === 404 ? (
      <EmptyState icon={Store} title="Store not found" description={error.message} className="min-h-screen" />
    ) : (
      <ErrorState error={error} onRetry={reload} className="min-h-screen" />
    );
  }

  const clampQty = (n) => Math.min(MAX_QTY, Math.max(MIN_QTY, Math.floor(Number(n)) || MIN_QTY));

  function addToCart() {
    if (cart.add(business, product, quantity)) toast.success(`${quantity} × ${product.name} added to cart`);
    else setConflict(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <ShopHeader shop={business} />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link to={storePath(business.slug)} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="size-4" /> Back to {business.name}
        </Link>

        {!product ? (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white">
            <EmptyState
              icon={PackageOpen}
              title="Product not available"
              description="This product doesn’t exist or is no longer available."
              action={<Link to={storePath(business.slug)} className="text-sm font-medium text-brand-600 hover:underline">Browse all products →</Link>}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 md:grid-cols-2 md:gap-10">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
              {product.image ? (
                <img src={product.image} alt={product.imageLabel || product.name} className="size-full object-contain" />
              ) : (
                <ImageOff className="size-12 text-neutral-300" />
              )}
            </div>

            <div className="flex flex-col">
              {product.category && <div className="text-sm font-medium text-neutral-500">{product.category}</div>}
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
              <div className="mt-3 text-2xl font-semibold">{formatPrice(product.price)}</div>
              {product.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-neutral-600">{product.description}</p>}

              <div className="mt-6">
                <span className="mb-2 block text-sm font-medium text-neutral-700">Quantity</span>
                <div className="inline-flex items-center rounded-lg border border-neutral-200">
                  <button type="button" onClick={() => setQuantity((q) => clampQty(q - 1))} disabled={quantity <= MIN_QTY} className="p-2.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30" aria-label="Decrease quantity">
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_QTY}
                    max={MAX_QTY}
                    value={quantity}
                    onChange={(e) => setQuantity(clampQty(e.target.value))}
                    className="w-14 [appearance:textfield] border-x border-neutral-200 py-2 text-center text-sm font-medium focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Quantity"
                  />
                  <button type="button" onClick={() => setQuantity((q) => clampQty(q + 1))} disabled={quantity >= MAX_QTY} className="p-2.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30" aria-label="Increase quantity">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={addToCart} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
                  <ShoppingCart className="size-4 shrink-0" /> Add to Cart
                </button>
                <a
                  href={whatsappLink(business.phone, productEnquiry({ businessName: business.name, productName: product.name, price: product.price, url: productUrl(business.slug, product._id) }))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-whatsapp px-4 text-sm font-medium text-white hover:bg-[#1fb855]"
                >
                  <MessageCircle className="size-4 shrink-0" /> WhatsApp
                </a>
              </div>
              {cart.business?._id === business._id && cart.count > 0 && (
                <Link to="/cart" className="mt-4 text-center text-sm font-medium text-brand-600 hover:underline">View cart ({cart.count})</Link>
              )}
            </div>
          </div>
        )}
      </div>

      <CartConflictModal
        open={conflict}
        currentShopName={cart.business?.name}
        onKeep={() => setConflict(false)}
        onReplace={() => {
          cart.replaceWith(business, product, quantity);
          toast.success(`${quantity} × ${product.name} added to cart`);
          setConflict(false);
        }}
      />
    </div>
  );
}
