import { api } from './client';

export const wishlistApi = {
  get: (opts) => api.get('/api/wishlist', opts),
  add: (productId, opts) => api.post('/api/wishlist', { productId }, opts),
  sync: (productIds, opts) => api.post('/api/wishlist', { productIds }, opts),
  remove: (productId, opts) => api.del(`/api/wishlist/${productId}`, opts),
};
