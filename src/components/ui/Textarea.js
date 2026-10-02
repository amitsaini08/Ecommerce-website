import { cn } from '@/lib/cn';

export default function Textarea({ error, className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-lg border bg-white px-3.5 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2',
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          : 'border-warm-300 focus:border-brand-600 focus:ring-brand-600/20',
        className
      )}
      {...props}
    />
  );
}