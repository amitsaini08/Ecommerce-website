'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/common/Toast';
import { getSocket } from '@/lib/socket';

import { reviewsApi } from '@/lib/apiClient/reviews';

const PAGE_SIZE = 5;
const EMPTY_SUMMARY = { avg: 0, count: 0, distribution: {} };
const EMPTY_PAGINATION = { page: 1, totalPages: 1, total: 0 };

export function useProductReviews(slug, productId) {
  const user = useSelector(selectUser);
  const toast = useToast();
  const userId = user?._id;

  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isMine = useCallback(
    (r) => !!userId && String(r.userId) === String(userId),
    [userId]
  );

  const fetchPage = useCallback(
    async (page = 1, signal) => {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)

      try {
        const data = await reviewsApi.getProductReviews(slug, page, PAGE_SIZE, { signal });

        if (page === 1) {
          setMyReviews(data.myReviews || []);
          setReviews(data.reviews || []);
        } else {
          setReviews((prev) => {
            const seen = new Set(prev.map((r) => r._id));
            return [...prev, ...(data.reviews || []).filter((r) => !seen.has(r._id))];
          });
        }
        setSummary(data.summary || EMPTY_SUMMARY);
        setPagination(data.pagination || { ...EMPTY_PAGINATION, page });
      } catch (err) {
        if (err.name === 'AbortError') return;
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [slug]
  );


  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => fetchPage(1, controller.signal));
    return () => controller.abort();
  }, [fetchPage, userId]);


  useEffect(() => {
    if (!productId) return;
    const socket = getSocket();

    const join = () => socket.emit('join-product', productId);
    join();
    socket.on('connect', join);

    const addFirst = (prev, review) =>
      prev.some((r) => r._id === review._id) ? prev : [review, ...prev];

    const onCreated = ({ review, summary }) => {
      if (isMine(review)) setMyReviews((p) => addFirst(p, review));
      else setReviews((p) => addFirst(p, review));
      setSummary(summary);
    };
    const onUpdated = ({ review, summary }) => {
      const swap = (p) => p.map((r) => (r._id === review._id ? review : r));
      if (isMine(review)) setMyReviews(swap);
      else setReviews(swap);
      setSummary(summary);
    };
    const onDeleted = ({ reviewId, summary }) => {
      setMyReviews((p) => p.filter((r) => r._id !== reviewId));
      setReviews((p) => p.filter((r) => r._id !== reviewId));
      setSummary(summary);
    };

    socket.on('review:created', onCreated);
    socket.on('review:updated', onUpdated);
    socket.on('review:deleted', onDeleted);

    return () => {
      socket.off('connect', join);
      socket.off('review:created', onCreated);
      socket.off('review:updated', onUpdated);
      socket.off('review:deleted', onDeleted);
      socket.emit('leave-product', productId);
    };
  }, [productId, isMine]);

  async function submit({ form, editId, originalMedia }) {
    if (!user) return toast.error('Please login to submit a review');

    const snapshot = myReviews;
    const tempId = `temp-${Date.now()}`;

    if (editId) {
      setMyReviews((prev) => prev.map((r) => (r._id === editId ? { ...r, ...form } : r)));
    } else {
      setMyReviews((prev) => [
        {
          _id: tempId,
          userId,
          userName: user.name || 'You',
          rating: form.rating,
          comment: form.comment,
          mediaUrls: form.mediaUrls,
          createdAt: new Date().toISOString(),
          _optimistic: true,
        },
        ...prev,
      ]);
    }

    try {
      const body = editId
        ? {
            rating: form.rating,
            comment: form.comment,
            addMedia: form.mediaUrls.filter((u) => !originalMedia.includes(u)),
            removeMedia: originalMedia.filter((u) => !form.mediaUrls.includes(u)),
          }
        : form;

      const data = await reviewsApi.saveProductReview(slug, editId, body);

      setMyReviews((prev) => prev.map((r) => (r._id === (editId || tempId) ? data.review : r)));
      setSummary(data.summary);
      toast.success(editId ? 'Review updated!' : 'Review submitted!');
    } catch (err) {
      setMyReviews(snapshot);
      toast.error(err.message || 'Failed to save review');
    }
  }

  async function remove(review) {
    if (!window.confirm('Delete this review? Attached photos/videos will also be removed.')) return;

    const snapshot = myReviews;
    setMyReviews((prev) => prev.filter((r) => r._id !== review._id));

    try {
      const data = await reviewsApi.removeProductReview(slug, review._id);
      setSummary(data.summary);
      toast.success('Review deleted');
    } catch {
      setMyReviews(snapshot);
      toast.error('Could not delete review');
    }
  }

  return {
    user,
    summary,
    myReviews,
    reviews,
    loading,
    loadingMore,
    hasMore: pagination.page < pagination.totalPages,
    loadMore: () => fetchPage(pagination.page + 1),
    submit,
    remove,
  };
}