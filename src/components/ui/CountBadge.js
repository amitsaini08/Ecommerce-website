import { cn } from '@/lib/cn';

const tones = {
  brand: 'bg-brand-500 text-white',
  rose: 'bg-rose-500 text-white',
};

export default function CountBadge({ count, tone = 'brand', className }) {
  if (!count || count <= 0) return null;

  return (
    <span
      className={cn(
        'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1',
        'text-[10px] font-bold leading-none',
        tones[tone],
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}