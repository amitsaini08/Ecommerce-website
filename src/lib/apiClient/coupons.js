import { api } from './client';

export const couponsApi = {
  validate: (code, subtotal, opts) =>
    api.post('/api/coupons/validate', { code, subtotal }, opts),
  save: (id, form, opts) =>
    id ? api.put(`/api/admin/coupons/${id}`, form, opts) : api.post('/api/admin/coupons', form, opts),
  remove: (id, opts) => api.del(`/api/admin/coupons/${id}`, opts),
};
