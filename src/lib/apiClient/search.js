import { api } from './client';

export const searchApi = {
  search: (params, opts) =>
    api.get(`/api/search${params ? `?${params}` : ''}`, opts),
};
