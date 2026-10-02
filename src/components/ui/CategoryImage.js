import Image from 'next/image';
import { Package } from 'lucide-react';
import { cn } from '@/lib/cn';

const sizes = {
  md: { box: 'h-12 w-12 sm:h-14 sm:w-14', px: '56px' },
  lg: { box: 'h-12 w-12 sm:h-16 sm:w-16', px: '64px' },
};

export default function CategoryImage({ category, size = 'md', className }) {
  const s = sizes[size];

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-warm-200 bg-warm-50',
        s.box,
        className
      )}
    >
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt={category.name}
          fill
          sizes={s.px}
          className="object-cover"
        />
      ) : (
        <Package className="h-5 w-5 text-warm-400" />
      )}
    </div>
  );
}