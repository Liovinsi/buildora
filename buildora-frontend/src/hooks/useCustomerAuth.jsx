import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { customerAuthService } from '../services/customerAuthService';
import { readStorage, writeStorage } from '../utils/storage';

// DEMO customer login (Phase 1) - NOT production auth. The session { token, customer } is kept in
// this browser. Replace with real auth later; orders already reference the backend customer id.
const STORAGE_KEY = 'buildora.demoCustomer';
export const DEMO_CUSTOMER = { name: 'Demo Customer', phone: '910000000001' };

const CustomerAuthContext = createContext(null);

function readSession() {
  try {
    const s = JSON.parse(readStorage(STORAGE_KEY));
    return s?.token && s?.customer ? s : null;
  } catch {
    return null;
  }
}

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const initial = useRef(session);

  const save = useCallback((next) => {
    writeStorage(STORAGE_KEY, next ? JSON.stringify(next) : null);
    setSession(next);
  }, []);

  // Re-check a remembered session once (it may have expired or the database may have been reset).
  useEffect(() => {
    const s = initial.current;
    if (!s) return;
    customerAuthService
      .me(s.token)
      .then((data) => save({ token: s.token, customer: data.customer }))
      .catch((err) => err.status === 401 && save(null));
  }, [save]);

  const login = useCallback(async (phone) => {
    const data = await customerAuthService.login(phone);
    save({ token: data.token, customer: data.customer });
    return data.customer;
  }, [save]);

  const register = useCallback(async (values) => {
    const data = await customerAuthService.register(values);
    save({ token: data.token, customer: data.customer });
    return data.customer;
  }, [save]);

  // One-click development account.
  const loginAsDemo = useCallback(async () => {
    try {
      return await login(DEMO_CUSTOMER.phone);
    } catch (err) {
      if (err.status !== 404) throw err;
      return register(DEMO_CUSTOMER);
    }
  }, [login, register]);

  const logout = useCallback(async () => {
    const token = session?.token;
    save(null);
    if (token) await customerAuthService.logout(token).catch(() => {});
  }, [session, save]);

  // Call from a failed request: clears an expired session. Returns true if it was an auth error.
  const handleAuthError = useCallback((err) => {
    if (err?.status !== 401) return false;
    save(null);
    return true;
  }, [save]);

  const value = useMemo(
    () => ({ customer: session?.customer || null, token: session?.token || null, isLoggedIn: Boolean(session), login, register, loginAsDemo, logout, handleAuthError }),
    [session, login, register, loginAsDemo, logout, handleAuthError]
  );
  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return ctx;
}
