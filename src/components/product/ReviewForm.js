'use client';

import { useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { validateReview, REVIEW_RULES } from '@/lib/reviewRules';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import StarPicker from '@/components/ui/StarPicker';
import ImageUpload from '@/components/ui/ImageUpload';

// review = null => naya review, review = object => edit
export default function ReviewForm({ review, onSubmit, onCancel }) {
  const [originalMedia] = useState(() =>
    Array.isArray(review?.mediaUrls) ? review.mediaUrls : []
  );
  const [form, setForm] = useState({
    rating: review?.rating ?? 4,
    comment: review?.comment || '',
    mediaUrls: originalMedia,
  });
  const [errors, setErrors] = useState({});
  const [showUpload, setShowUpload] = useState(originalMedia.length > 0);

  const update = (field, value, errorKey = field) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [errorKey]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateReview(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit({ form, editId: review?._id ?? null, originalMedia });
  };

  const overLimit = form.comment.length > REVIEW_RULES.MAX_COMMENT_CHARS;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-warm-200 bg-warm-50 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-warm-900">
          {review ? 'Edit your review' : 'Your review'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close review form"
          className="-mr-1.5 rounded-full p-1.5 text-warm-500 transition-colors hover:bg-warm-100 hover:text-warm-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-warm-600">Your rating</p>
        <StarPicker value={form.rating} onChange={(v) => update('rating', v)} />
        {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating}</p>}
      </div>

      <div>
        <Textarea
          rows={4}
          value={form.comment}
          error={errors.comment}
          onChange={(e) => update('comment', e.target.value)}
          placeholder="What did you like or dislike? How was the quality and delivery?"
        />
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-red-600">{errors.comment}</span>
          <span className={cn(overLimit ? 'text-red-600' : 'text-warm-500')}>
            {form.comment.length}/{REVIEW_RULES.MAX_COMMENT_CHARS}
          </span>
        </div>
      </div>

      <div>
        {!showUpload && form.mediaUrls.length === 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
            className="border-dashed bg-white"
          >
            <ImagePlus className="h-4 w-4" /> Add photos or video
          </Button>
        ) : (
          <div className="max-h-56 max-w-sm overflow-y-auto rounded-lg [&_img]:max-h-16 [&_img]:w-16 [&_img]:object-cover [&_video]:max-h-16 [&_video]:w-16">
            <ImageUpload
              uploadType="review-media"
              value={form.mediaUrls}
              onChange={(urls) => update('mediaUrls', urls, 'media')}
              multiple
              maxFiles={REVIEW_RULES.MAX_MEDIA_FILES}
              maxSizeMB={50}
              label="Photos or short video (optional, up to 4)"
            />
            {errors.media && <p className="mt-1 text-xs text-red-600">{errors.media}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="dark">
          {review ? 'Update review' : 'Submit review'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}