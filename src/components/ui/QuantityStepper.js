import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

const sizes = {
  md: { box: 'h-10', btn: 'w-10', text: 'w-10 text-sm', icon: 'h-4 w-4' },
  sm: { box: 'h-8', btn: 'w-8', text: 'w-8 text-xs', icon: 'h-3.5 w-3.5' },
};

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  onLimit, // max par plus dabane par call hota hai (toast ke liye)
}) {
  const s = sizes[size];
  const atMin = value <= min;
  const atMax = value >= max;

  const btn = cn(
    'flex h-full items-center justify-center text-warm-700 transition-colors hover:bg-warm-50',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent',
    s.btn
  );

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-warm-300 bg-white', s.box)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${btn} rounded-l-lg`}
      >
        <Minus className={s.icon} />
      </button>

      <span className={cn('text-center font-semibold text-warm-900', s.text)}>{value}</span>

      <button
        type="button"
        aria-label="Increase quantity"
        aria-disabled={atMax}
        onClick={() => (atMax ? onLimit?.() : onChange(value + 1))}
        className={`${btn} rounded-r-lg`}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}