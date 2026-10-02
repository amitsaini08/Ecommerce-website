import { api } from './client';

export const reviewsApi = {
  getAdmin: (page, opts) => api.get(`/api/admin/reviews?page=${page}`, opts),
  toggleHide: (id, opts) => api.patch(`/api/admin/reviews/${id}`, undefined, opts),
  removeAdmin: (id, opts) => api.del(`/api/admin/reviews/${id}`, opts),
  getProductReviews: (slug, page, limit = 5, opts) =>
    api.get(`/api/products/${slug}/reviews?page=${page}&limit=${limit}`, opts),
  saveProductReview: (slug, editId, body, opts) =>
    editId
      ? api.put(`/api/products/${slug}/reviews/${editId}`, body, opts)
      : api.post(`/api/products/${slug}/reviews`, body, opts),
  removeProductReview: (slug, reviewId, opts) =>
    api.del(`/api/products/${slug}/reviews/${reviewId}`, opts),
};
