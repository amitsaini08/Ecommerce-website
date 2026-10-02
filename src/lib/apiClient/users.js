import { api } from './client';

export const usersApi = {
  getAdmin: (params, opts) =>
    api.get(`/api/admin/users${params ? `?${params}` : ''}`, opts),
  updateRole: (userId, role, opts) =>
    api.patch('/api/admin/users', { userId, role }, opts),
};
