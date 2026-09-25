import { Link } from 'react-router';
import { ImageOff, MessageCircle, ShoppingCart } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { productPath } from '../utils/shopPaths';
import { productEnquiry, productUrl, whatsappLink } from '../utils/whatsapp';

// Public shop product card: image/name open the product page; Add to Cart + WhatsApp enquiry
// (the WhatsApp button never creates an order).
export function ProductCard({ product, business, onAddToCart }) {
  const href = productPath(business.slug, product._id);
  const enquiry = productEnquiry({
    businessName: business.name,
    productName: product.name,
    price: product.price,
    url: business.slug ? productUrl(business.slug, product._id) : undefined,
  });

  return (
    <article id={`product-${product._id}`} className="flex scroll-mt-20 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white target:ring-2 target:ring-neutral-900">
      <Link to={href} className="group block aspect-[4/3] overflow-hidden bg-neutral-100" aria-label={`View ${product.name}`}>
        {product.image ? (
          <img src={product.image} alt={product.imageLabel || product.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-300">
            <ImageOff className="size-8" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {product.category && <div className="text-xs font-medium text-neutral-500">{product.category}</div>}
        <h3 className="mt-0.5 font-semibold text-neutral-900">
          <Link to={href} className="hover:underline">{product.name}</Link>
        </h3>
        {product.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{product.description}</p>}
        <div className="mt-auto pt-4">
          <span className="text-lg font-semibold">{formatPrice(product.price)}</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <ShoppingCart className="size-4 shrink-0" /> Add to Cart
            </button>
            <a
              href={whatsappLink(business.phone, enquiry)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-whatsapp px-3 text-sm font-medium text-white hover:bg-[#1fb855]"
            >
              <MessageCircle className="size-4 shrink-0" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
