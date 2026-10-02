import { Package } from 'lucide-react';
import { cn } from '@/lib/cn';

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
};

export default function Thumb({ src, size = 'sm', className }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-warm-200 bg-warm-100 text-warm-500',
        sizes[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <Package className="h-4 w-4" />
      )}
    </div>
  );
}