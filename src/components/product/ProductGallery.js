'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { cn } from '@/lib/cn';
import Badge from '@/components/ui/Badge';

export default function ProductGallery({ images = [], name, discountPercent = 0 }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row lg:sticky lg:top-20">
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:max-h-96 sm:flex-col sm:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                selected === i ? 'border-warm-900' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <Image src={img} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl border border-warm-200 bg-warm-50">
        {current ? (
          <Image
            src={current}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-warm-300">
            <Package className="h-12 w-12" />
          </div>
        )}

        {discountPercent > 0 && (
          <Badge tone="danger" className="absolute left-3 top-3">
            {discountPercent}% off
          </Badge>
        )}
      </div>
    </div>
  );
}