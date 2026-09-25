import { api } from './api';
import { customerHeaders } from './customerAuthService';

// Customer side: always sends the demo customer token; the backend only returns that customer's orders.
export const customerOrderService = {
  create: (token, data) => api.post('/orders', data, { headers: customerHeaders(token) }),
  list: (token) => api.get('/orders/my', { headers: customerHeaders(token) }),
  get: (token, orderId) => api.get(`/orders/my/${orderId}`, { headers: customerHeaders(token) }),
  submitPayment: (token, orderId, data) => api.post(`/orders/my/${orderId}/payment`, data, { headers: customerHeaders(token) }),
};

// Owner side: scoped to one business (no customer token is ever sent here).
export const ownerOrderService = {
  list: (businessId, params) => api.get(`/orders/business/${businessId}`, { params }),
  get: (businessId, orderId) => api.get(`/orders/business/${businessId}/${orderId}`),
  updateStatus: (businessId, orderId, data) => api.patch(`/orders/business/${businessId}/${orderId}/status`, data),
  reviewPayment: (businessId, orderId, data) => api.patch(`/orders/business/${businessId}/${orderId}/payment`, data),
};
