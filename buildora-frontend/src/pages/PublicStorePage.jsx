import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { MapPin, MessageCircle, PackageOpen, ShoppingBag, Store } from 'lucide-react';
import { BusinessAvatar } from '../components/BusinessAvatar';
import { ProductCard } from '../components/ProductCard';
import { CartConflictModal } from '../components/shop/CartConflictModal';
import { ShopHeader } from '../components/shop/ShopHeader';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback';
import { useApi } from '../hooks/useApi';
import { useCart } from '../hooks/useCart';
import { useCategories } from '../hooks/useCategories';
import { useRememberShop } from '../hooks/useCurrentShop';
import { useToast } from '../hooks/useToast';
import { formatPrice } from '../utils/format';
import { businessService } from '../services/businessService';
import { cn } from '../utils/cn';
import { whatsappLink } from '../utils/whatsapp';

export default function PublicStorePage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(() => businessService.getStore(slug), [slug]);
  const { getCategory } = useCategories();
  const [filter, setFilter] = useState('All');
  const cart = useCart();
  const toast = useToast();
  const [conflict, setConflict] = useState(null); // product waiting while the cart holds another shop

  const business = data?.business;
  useRememberShop(business);
  const products = useMemo(() => data?.products || [], [data]);
  const groups = useMemo(() => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const visible = filter === 'All' ? products : products.filter((p) => p.category === filter);

  // Product links shared on WhatsApp (#product-<id>): scroll to that card once products render.
  useEffect(() => {
    if (!products.length || !window.location.hash.startsWith('#product-')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [products]);

  useEffect(() => {
    if (business) document.title = `${business.name} · Buildora`;
    return () => { document.title = 'Buildora'; };
  }, [business]);

  if (loading) return <PageLoader label="Opening store…" />;
  if (error) {
    return error.status === 404 ? (
      <EmptyState icon={Store} title="Store not found" description={error.message} className="min-h-screen" />
    ) : (
      <ErrorState error={error} onRetry={reload} className="min-h-screen" />
    );
  }

  const category = getCategory(business.category);
  const tagline = business.store?.tagline || category?.examples.join(' | ');
  const theme = business.store?.themeColor || '#4f46e5';
  const cartHere = cart.business?._id === business._id && cart.count > 0;
  const cartSubtotal = cartHere ? cart.resolve(products).subtotal : 0;

  function addToCart(product) {
    if (cart.add(business, product)) toast.success(`${product.name} added to cart`);
    else setConflict(product);
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <ShopHeader shop={business} />
      <div className="h-28 sm:h-36" style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)` }} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <header className="-mt-12 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <BusinessAvatar name={business.name} logo={business.logo} color={theme} className="size-20 border-4 border-white text-2xl shadow-sm" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight uppercase">{business.name}</h1>
              {tagline && <p className="mt-0.5 text-sm font-medium text-neutral-600">{tagline}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                {category && <span>{category.name}</span>}
                {business.location && (
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {business.location}</span>
                )}
              </div>
            </div>
            <a
              href={whatsappLink(business.phone, `Hi ${business.name}, I found your store on Buildora.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-whatsapp px-4 text-sm font-medium text-white hover:bg-[#1fb855]"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
          </div>
          {business.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-neutral-600">{business.description}</p>}
        </header>

        {groups.length > 2 && (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium',
                  filter === g ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        <section className="mt-6">
          {visible.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p._id} product={p} business={business} onAddToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white">
              <EmptyState icon={PackageOpen} title="No products yet" description="Message us on WhatsApp to see what's available." />
            </div>
          )}
        </section>

        <footer className="mt-12 text-center text-xs text-neutral-400">
          Powered by <a href="/" className="font-medium hover:text-neutral-600">Buildora</a>
          {' · '}
          <a href="/privacy-policy" className="hover:text-neutral-600">Privacy Policy</a>
        </footer>
      </div>

      {cartHere && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-1 sm:px-6">
            <span className="text-sm">
              <span className="font-semibold">{cart.count} item{cart.count > 1 ? 's' : ''}</span> · {formatPrice(cartSubtotal)}
            </span>
            <Link to="/cart" className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
              <ShoppingBag className="size-4" /> View cart
            </Link>
          </div>
        </div>
      )}

      <CartConflictModal
        open={Boolean(conflict)}
        currentShopName={cart.business?.name}
        onKeep={() => setConflict(null)}
        onReplace={() => {
          cart.replaceWith(business, conflict);
          toast.success(`${conflict.name} added to cart`);
          setConflict(null);
        }}
      />
    </div>
  );
}
