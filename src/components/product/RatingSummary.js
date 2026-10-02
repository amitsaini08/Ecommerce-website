import { Star } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';

export default function RatingSummary({ avg = 0, count = 0, distribution = {} }) {
  return (
    <div className="flex w-full flex-col gap-5 rounded-xl border border-warm-200 bg-warm-50 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex flex-col items-center justify-center gap-1 text-center sm:w-40">
        <p className="text-4xl font-extrabold leading-none text-warm-900">
          {Number(avg || 0).toFixed(1)}
        </p>
        <StarRating rating={avg} size="sm" />
        <p className="text-xs text-warm-600">
          {count} review{count !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="w-full flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution?.[star] ?? 0;
          const pct = count ? (n / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-warm-700">
              <span className="flex w-8 shrink-0 items-center gap-0.5">
                {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-warm-200">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-warm-500">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}