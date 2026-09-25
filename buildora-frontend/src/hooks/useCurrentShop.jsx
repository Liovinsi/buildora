import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { businessService } from '../services/businessService';
import { readStorage, writeStorage } from '../utils/storage';

// The shop the customer is currently browsing, shared by all customer pages (header, links).
// Only { _id, slug, name } is remembered in the browser; the full public info (logo etc.) is
// kept in memory and re-fetched from the lightweight summary endpoint after a reload.
const STORAGE_KEY = 'buildora.currentShop';
const ShopContext = createContext(null);

function readRef() {
  try {
    const s = JSON.parse(readStorage(STORAGE_KEY));
    return s?._id && s?.slug ? { _id: s._id, slug: s.slug, name: s.name || '' } : null;
  } catch {
    return null;
  }
}

export function CurrentShopProvider({ children }) {
  const [shop, setShopState] = useState(readRef);
  const [loadedSlug, setLoadedSlug] = useState(null); // slug whose full info is in `shop`
  const fetching = useRef(null);

  /** Pages call this with a business object they already have (store, product, order, cart). */
  const setShop = useCallback((business) => {
    if (!business?._id || !business?.slug) return;
    writeStorage(STORAGE_KEY, JSON.stringify({ _id: business._id, slug: business.slug, name: business.name }));
    setShopState((prev) => (prev?._id === business._id && prev.logo !== undefined && business.logo === undefined ? { ...prev, ...business, logo: prev.logo } : business));
    if (business.logo !== undefined) setLoadedSlug(business.slug);
  }, []);

  // After a reload only the reference is known: fetch logo etc. once.
  useEffect(() => {
    if (!shop?.slug || loadedSlug === shop.slug || fetching.current === shop.slug) return;
    fetching.current = shop.slug;
    businessService
      .getStoreSummary(shop.slug)
      .then(setShop)
      .catch((err) => {
        if (err.status === 404) {
          writeStorage(STORAGE_KEY, null);
          setShopState(null);
        }
      });
  }, [shop, loadedSlug, setShop]);

  const value = useMemo(() => ({ shop, setShop }), [shop, setShop]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useCurrentShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useCurrentShop must be used inside CurrentShopProvider');
  return ctx;
}

/** Register `business` as the current shop whenever it changes. */
export function useRememberShop(business) {
  const { setShop } = useCurrentShop();
  useEffect(() => {
    if (business?._id) setShop(business);
  }, [business, setShop]);
}
