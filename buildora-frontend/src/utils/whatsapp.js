import { formatPrice } from './format';
import { productPath } from './shopPaths';

export function whatsappLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

// Pre-filled product enquiry for wa.me links. Enquiry only: never creates an order.
export function productEnquiry({ businessName, productName, price, url }) {
  const lines = [
    `Hi ${businessName || 'there'}, I'm interested in this product:`,
    `${productName}${price !== undefined ? ` - ${formatPrice(price)}` : ''}`,
  ];
  if (url) lines.push(url);
  lines.push('Is it available?');
  return lines.join('\n');
}

// Absolute link to a product's page, for sharing in WhatsApp messages.
export const productUrl = (slug, productId) => `${window.location.origin}${productPath(slug, productId)}`;

// WhatsApp only allows free-form replies within 24h of the customer's last message.
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
