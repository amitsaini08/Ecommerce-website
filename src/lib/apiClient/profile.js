import { api } from './client';

export const profileApi = {
  get: (opts) => api.get('/api/profile', opts),
  update: (data, opts) => api.put('/api/profile', data, opts),
  getAddresses: (opts) => api.get('/api/addresses', opts),
  addAddress: (data, opts) => api.post('/api/addresses', data, opts),
  changePassword: (data, opts) => api.post('/api/user/change-password', data, opts),
};
