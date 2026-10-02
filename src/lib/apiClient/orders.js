import { api } from './client';

export const ordersApi = {
  getAdmin: (params, opts) =>
    api.get(`/api/admin/orders${params ? `?${params}` : ''}`, opts),
  getAdminById: (id, opts) => api.get(`/api/admin/orders/${id}`, opts),
  adminAction: (id, body, opts) =>
    api.post(`/api/admin/orders/${id}/action`, body, opts),
  getUserOrders: (opts) => api.get('/api/orders', opts),
  getUserOrderById: (id, opts) => api.get(`/api/orders/${id}`, opts),
  cancel: (id, reason, opts) =>
    api.post(`/api/orders/${id}/cancel`, { reason }, opts),
  return: (id, reason, opts) =>
    api.post(`/api/orders/${id}/return`, { reason }, opts),
  createOrder: (data, opts) => api.post('/api/payment/create-order', data, opts),
  verifyPayment: (data, opts) => api.post('/api/payment/verify', data, opts),
  retryPayment: (orderId, opts) =>
    api.post(`/api/payment/retry/${orderId}`, undefined, opts),
};
