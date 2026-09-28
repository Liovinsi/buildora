import { api } from './api';

export const whatsappService = {
  config: () => api.get('/whatsapp/config'),
  status: (businessId) => api.get(`/whatsapp/status/${businessId}`),
  // Completes Meta Embedded Signup: the backend exchanges `code` and verifies everything with Meta.
  connect: ({ businessId, code, redirectUri, event, wabaId, phoneNumberId }) =>
    api.post('/whatsapp/connect', { businessId, code, redirectUri, event, wabaId, phoneNumberId }, { timeout: 60000 }),
  disconnect: (businessId) => api.post('/whatsapp/disconnect', { businessId }),
  send: ({ businessId, customerPhone, message }) =>
    api.post('/whatsapp/send', { businessId, customerPhone, message }),
};
