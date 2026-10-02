import { api } from './client';

export const bannersApi = {
  getAll: (opts) => api.get('/api/banners', opts),
  getAdmin: (opts) => api.get('/api/admin/banners', opts),
  save: (id, form, opts) =>
    id ? api.put(`/api/admin/banners/${id}`, form, opts) : api.post('/api/admin/banners', form, opts),
  remove: (id, opts) => api.del(`/api/admin/banners/${id}`, opts),
};
