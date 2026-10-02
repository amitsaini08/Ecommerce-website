import { Film, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate, isVideoUrl } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';

export default function ReviewCard({ review, isOwner = false, onEdit, onDelete, onOpenMedia }) {
  const media = Array.isArray(review.mediaUrls) ? review.mediaUrls : [];

  return (
    <li
      className={cn(
        'w-full rounded-xl border p-4 sm:p-5',
        isOwner ? 'border-brand-600/40 bg-brand-50/40' : 'border-warm-200 bg-white',
        review._optimistic && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={{ name: review.userName }} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-warm-900">
              {isOwner ? 'You' : review.userName || 'Verified buyer'}
            </p>
            <p className="text-xs text-warm-500">
              {review._optimistic ? 'Posting…' : formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        {isOwner && !review._optimistic && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(review)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(review)}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {review.rating > 0 && (
        <div className="mt-3" role="img" aria-label={`Rated ${review.rating} out of 5`}>
          <StarRating rating={review.rating} size="sm" />
        </div>
      )}

      {review.comment && (
        <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-warm-700">{review.comment}</p>
      )}

      {media.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {media.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenMedia(url)}
              aria-label="View media"
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-warm-200 bg-warm-100 transition-colors hover:border-warm-500"
            >
              {isVideoUrl(url) ? (
                <>
                  <video src={url} className="h-full w-full object-cover" muted />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Film className="h-4 w-4 text-white" />
                  </span>
                </>
              ) : (
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}