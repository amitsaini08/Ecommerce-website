'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import ContentSection from '@/components/ui/ContentSection';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Lightbox from '@/components/ui/Lightbox';
import RatingSummary from './RatingSummary';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';

export default function ReviewsSection({
  user,
  summary,
  myReviews,
  reviews,
  loading,
  loadingMore,
  hasMore,
  loadMore,
  submit,
  remove,
}) {
  
  const [formState, setFormState] = useState(null);
  const [modalMedia, setModalMedia] = useState(null);
  const closeMedia = useCallback(() => setModalMedia(null), []);

  const editingId = formState?.review?._id;
  const hasMyReview = myReviews.length > 0;
  const visibleMine = myReviews.filter((r) => r._id !== editingId);

  const handleSubmit = (payload) => {
    setFormState(null);
    submit(payload);
  };

  return (
    <ContentSection id="reviews" title="Customer reviews">
      <div className="flex flex-col gap-6">
        <RatingSummary
          avg={summary.avg}
          count={summary.count}
          distribution={summary.distribution}
        />

        {user ? (
          <Button
            variant="dark"
            className="self-start"
            onClick={() => setFormState({ review: null })}
          >
            <Pencil className="h-4 w-4" /> Write a review
          </Button>
        ) : (
          <div className="self-start rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-700">
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>{' '}
            to write a review.
          </div>
        )}

        {user && formState && (
          <ReviewForm
            key={editingId || 'new'}
            review={formState.review}
            onSubmit={handleSubmit}
            onCancel={() => setFormState(null)}
          />
        )}

        {visibleMine.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-warm-900">Your review</h3>
            <ul className="space-y-3">
              {visibleMine.map((r) => (
                <ReviewCard
                  key={r._id}
                  review={r}
                  isOwner
                  onEdit={(review) => setFormState({ review })}
                  onDelete={remove}
                  onOpenMedia={setModalMedia}
                />
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-warm-900">
            {hasMyReview ? 'Other reviews' : 'All reviews'}
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-warm-100" />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="max-h-screen overflow-y-auto pr-1">
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <ReviewCard key={r._id} review={r} onOpenMedia={setModalMedia} />
                ))}
              </ul>

              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore && <Spinner />}
                    {loadingMore ? 'Loading…' : 'Load more reviews'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-warm-200 py-8 text-center">
              <p className="text-sm text-warm-500">
                {hasMyReview
                  ? 'No other reviews yet.'
                  : 'No reviews yet. Be the first to review this product.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <Lightbox url={modalMedia} onClose={closeMedia} />
    </ContentSection>
  );
}