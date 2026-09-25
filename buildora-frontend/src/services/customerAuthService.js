import { api } from './api';

// DEMO customer auth (Phase 1): phone only, no password/OTP. The customer token travels in its own
// header and is only sent by customer calls, never by owner/dashboard calls.
export const customerHeaders = (token) => (token ? { 'X-Customer-Token': token } : {});

export const customerAuthService = {
  register: (data) => api.post('/customer-auth/register', data),
  login: (phone) => api.post('/customer-auth/login', { phone }),
  logout: (token) => api.post('/customer-auth/logout', {}, { headers: customerHeaders(token) }),
  me: (token) => api.get('/customer-auth/me', { headers: customerHeaders(token) }),
};
