import { api } from './client';

export const contactApi = {
  send: (data, opts) => api.post('/api/contact', data, opts),
};
