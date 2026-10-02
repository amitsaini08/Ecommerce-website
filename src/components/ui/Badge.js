import { cn } from '@/lib/cn';

const tones = {
  brand: 'bg-brand-50 text-brand-600',
  danger: 'bg-red-600 text-white',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-100 text-amber-900',
};

export default function Badge({ tone = 'brand', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}