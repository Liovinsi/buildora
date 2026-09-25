import { api } from './api';

// Every call is scoped to the business; the backend rejects customers of other businesses.
export const inboxService = {
  customers: (businessId) => api.get(`/customers/business/${businessId}`),
  markRead: (businessId, customerId) => api.put(`/customers/${customerId}/read`, { businessId }),
  conversation: (businessId, customerId) => api.get(`/messages/customer/${customerId}`, { params: { businessId } }),
};
