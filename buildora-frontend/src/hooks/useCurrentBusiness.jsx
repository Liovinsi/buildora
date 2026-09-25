import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { businessService } from '../services/businessService';
import { readStorage, writeStorage } from '../utils/storage';

// V1 "auth": the dashboard works on one selected business, remembered in this browser.
// When real auth arrives, this provider is where the logged-in user's business is loaded.
const STORAGE_KEY = 'buildora.businessId';
const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [businessId, setBusinessIdState] = useState(() => readStorage(STORAGE_KEY));
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(Boolean(businessId));
  const [error, setError] = useState(null);

  const setBusinessId = useCallback((id) => {
    writeStorage(STORAGE_KEY, id);
    setBusinessIdState(id);
    setBusiness(null);
    setLoading(Boolean(id));
  }, []);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    try {
      setError(null);
      setBusiness(await businessService.get(businessId));
    } catch (err) {
      if (err.status === 404 || err.status === 400) {
        writeStorage(STORAGE_KEY, null); // stale id (e.g. database reset)
        setBusinessIdState(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BusinessContext.Provider value={{ businessId, business, setBusiness, setBusinessId, loading, error, refresh }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useCurrentBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useCurrentBusiness must be used inside BusinessProvider');
  return ctx;
}
