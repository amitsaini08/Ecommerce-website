'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import Pagination from '@/components/common/Pagination';
import StarRating from '@/components/ui/StarRating';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import { Eye, EyeOff, Trash2, Film, X } from 'lucide-react';

const isVideoUrl = (url) =>
  !!url && (/\.(mp4|webm|mov|avi|mkv)($|\?)/i.test(url) || url.includes('/video/upload/'));

import { reviewsApi } from '@/lib/apiClient/reviews';
import { useMutation } from '@/hooks/useMutation';

export default function AdminReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null); // review currently being hidden/deleted
  const [modalMedia, setModalMedia] = useState(null);

  const toggleMutation = useMutation((id) => reviewsApi.toggleHide(id));
  const deleteMutation = useMutation((id) => reviewsApi.removeAdmin(id));

  useEffect(() => {
    fetchReviews();
  }, [pagination.page]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const data = await reviewsApi.getAdmin(pagination.page);
      setReviews(data?.reviews || []);
      setPagination((p) => data?.pagination || p);
    } catch {
      toast.error('Failed to load reviews');
    }
    setLoading(false);
  }

  async function toggleHide(id) {
    setBusyId(id);
    const res = await toggleMutation.run(id);
    if (res) {
      toast.success('Review visibility updated');
      await fetchReviews();
    }
    setBusyId(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this review permanently?')) return;
    setBusyId(id);
    const res = await deleteMutation.run(id);
    if (res) {
      toast.success('Review deleted');
      await fetchReviews();
    }
    setBusyId(null);
  }

  const columns = [
    {
      key: 'product',
      header: 'Product',
      className: 'max-w-[160px]',
      render: (r) => (
        <span className="block truncate font-semibold text-warm-900">{r.productName || '—'}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <>
          <p className="font-medium text-warm-900">{r.userName || 'Customer'}</p>
          <p className="text-[11px] text-warm-400">{r.userEmail}</p>
        </>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => <StarRating rating={r.rating} size="xs" />,
    },
    {
      key: 'comment',
      header: 'Comment & Media',
      className: 'max-w-[280px]',
      render: (r) => (
        <>
          {r.comment && <p className="mb-1 line-clamp-2 text-warm-700">{r.comment}</p>}
          {Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pt-0.5">
              {r.mediaUrls.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setModalMedia(url)}
                  title="View media"
                  className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-warm-200 bg-warm-100 transition-transform hover:scale-105"
                >
                  {isVideoUrl(url) ? (
                    <span className="flex h-full w-full items-center justify-center bg-warm-900 text-white">
                      <Film className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-warm-400">{new Date(r.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => {
        const id = r._id || r.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              loading={busyId === id}
              onClick={() => toggleHide(id)}
              title={r.isHidden ? 'Publish review' : 'Hide review'}
              aria-label={r.isHidden ? 'Publish review' : 'Hide review'}
            >
              {busyId !== id && (r.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyId === id}
              onClick={() => handleDelete(id)}
              title="Delete review"
              aria-label="Delete review"
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-warm-900">Review Moderation</h1>
        <p className="text-[11px] text-warm-500">Moderate customer ratings, feedback, and attached media</p>
      </div>

      <DataTable
        columns={columns}
        rows={reviews}
        loading={loading}
        emptyText="No reviews submitted yet."
        rowClassName={(r) => (r.isHidden ? 'bg-warm-50/40 opacity-50' : '')}
      />

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      )}

      {/* Lightbox */}
      {modalMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalMedia(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-2xl overflow-hidden rounded-md bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalMedia(null)}
              aria-label="Close"
              className="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            {isVideoUrl(modalMedia) ? (
              <video src={modalMedia} controls autoPlay className="mx-auto max-h-[80vh] w-auto" />
            ) : (
              <img src={modalMedia} alt="" className="mx-auto max-h-[80vh] w-auto object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}