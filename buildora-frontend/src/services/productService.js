import { api } from './api';

export const productService = {
  listByBusiness: (businessId) => api.get(`/products/business/${businessId}`),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};
