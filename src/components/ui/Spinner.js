import { cn } from '@/lib/cn';

export default function Spinner({ className }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-warm-300 border-t-warm-700',
        className
      )}
    />
  );
}