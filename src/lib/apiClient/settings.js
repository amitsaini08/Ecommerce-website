import { api } from './client';

export const settingsApi = {
  get: (opts) => api.get('/api/admin/settings', opts),
  update: (data, opts) => api.put('/api/admin/settings', data, opts),
};
