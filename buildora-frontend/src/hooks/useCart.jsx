import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

// One cart per browser, for ONE shop at a time (an order belongs to exactly one business).
// Only product ids + quantities are stored; names, prices and images always come from the
// shop's current products (see `resolve`), and the backend recalculates totals at checkout.
const STORAGE_KEY = 'buildora.cart';
export const MIN_QTY = 1;
export const MAX_QTY = 99;
const EMPTY = { business: null, items: [] };

const CartContext = createContext(null);

const clampQty = (n) => Math.min(MAX_QTY, Math.max(MIN_QTY, Math.floor(Number(n)) || MIN_QTY));

function readCart() {
  try {
    const c = JSON.parse(readStorage(STORAGE_KEY));
    if (!c?.business?._id || !c.business.slug || !Array.isArray(c.items)) return EMPTY;
    const items = c.items
      .filter((i) => typeof i?.productId === 'string' && i.productId)
      .map((i) => ({ productId: i.productId, quantity: clampQty(i.quantity) }));
    return items.length ? { business: c.business, items } : EMPTY;
  } catch {
    return EMPTY;
  }
}

const shopOf = (b) => ({ _id: b._id, slug: b.slug, name: b.name });

export function CartProvider({ children }) {
  const [cart, setCartState] = useState(readCart);

  const setCart = useCallback((updater) => {
    setCartState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const clean = next.items.length ? next : EMPTY;
      writeStorage(STORAGE_KEY, clean.items.length ? JSON.stringify(clean) : null);
      return clean;
    });
  }, []);

  /** Returns false (and changes nothing) if the cart holds another shop's products. */
  const add = useCallback((business, product, quantity = 1) => {
    if (cart.business && cart.business._id !== business._id && cart.items.length) return false;
    const qty = clampQty(quantity);
    setCart((c) => {
      const existing = c.items.find((i) => i.productId === product._id);
      const items = existing
        ? c.items.map((i) => (i.productId === product._id ? { ...i, quantity: clampQty(i.quantity + qty) } : i))
        : [...c.items, { productId: product._id, quantity: qty }];
      return { business: shopOf(business), items };
    });
    return true;
  }, [cart, setCart]);

  const replaceWith = useCallback(
    (business, product, quantity = 1) => setCart({ business: shopOf(business), items: [{ productId: product._id, quantity: clampQty(quantity) }] }),
    [setCart]
  );

  // Quantity is always kept within MIN_QTY..MAX_QTY; use `remove` to delete a line.
  const setQuantity = useCallback((productId, quantity) => {
    setCart((c) => ({ ...c, items: c.items.map((i) => (i.productId === productId ? { ...i, quantity: clampQty(quantity) } : i)) }));
  }, [setCart]);

  const remove = useCallback((productId) => setCart((c) => ({ ...c, items: c.items.filter((i) => i.productId !== productId) })), [setCart]);
  const clear = useCallback(() => setCart(EMPTY), [setCart]);

  /** Drop products that no longer exist / are unavailable in the shop. */
  const prune = useCallback((productIds) => {
    const gone = new Set(productIds);
    setCart((c) => ({ ...c, items: c.items.filter((i) => !gone.has(i.productId)) }));
  }, [setCart]);

  /**
   * Join the cart with the shop's current products (pure; changes nothing).
   * Returns { lines, subtotal, missing } where `missing` are product ids no longer in the shop.
   */
  const resolve = useCallback((products = []) => {
    const byId = new Map(products.map((p) => [p._id, p]));
    const lines = [];
    const missing = [];
    for (const { productId, quantity } of cart.items) {
      const p = byId.get(productId);
      if (!p) missing.push(productId);
      else lines.push({ productId, quantity, name: p.name, price: p.price, image: p.image || '', lineTotal: Math.round(p.price * quantity * 100) / 100 });
    }
    const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    return { lines, subtotal, missing };
  }, [cart]);

  const value = useMemo(() => {
    const count = cart.items.reduce((n, i) => n + i.quantity, 0);
    return { ...cart, count, add, replaceWith, setQuantity, remove, clear, prune, resolve };
  }, [cart, add, replaceWith, setQuantity, remove, clear, prune, resolve]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
