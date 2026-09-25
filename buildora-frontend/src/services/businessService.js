import { api } from './api';

export const businessService = {
  categories: () => api.get('/categories'),
  list: () => api.get('/businesses'),
  create: (data) => api.post('/businesses', data),
  get: (id) => api.get(`/businesses/${id}`),
  update: (id, data) => api.put(`/businesses/${id}`, data),
  stats: (id) => api.get(`/businesses/${id}/stats`),
  getStore: (slug) => api.get(`/businesses/slug/${encodeURIComponent(slug)}`),
  getStoreSummary: (slug) => api.get(`/businesses/slug/${encodeURIComponent(slug)}/summary`),
  updatePaymentSettings: (id, data) => api.put(`/businesses/${id}/payment-settings`, data),
};
