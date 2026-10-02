import { api } from './client';

export const productsApi = {
  getAll: (params, opts) =>
    api.get(`/api/products${params ? `?${params}` : ''}`, opts),
  getBySlug: (slug, opts) => api.get(`/api/products/${slug}`, opts),
  getAdmin: (params, opts) =>
    api.get(`/api/admin/products${params ? `?${params}` : ''}`, opts),
  getAdminById: (id, opts) => api.get(`/api/admin/products/${id}`, opts),
  save: (id, data, opts) =>
    id ? api.put(`/api/admin/products/${id}`, data, opts) : api.post('/api/admin/products', data, opts),
  remove: (id, opts) => api.del(`/api/admin/products/${id}`, opts),
};
