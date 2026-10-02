import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onClick={() => onChange(star)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <Star
            className={cn('h-7 w-7', star <= value ? 'fill-amber-400 text-amber-400' : 'text-warm-300')}
          />
        </button>
      ))}
    </div>
  );
}