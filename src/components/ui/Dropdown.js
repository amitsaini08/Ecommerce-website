'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { useOutsideClick } from '@/hooks/useOutsideClick';

export default function Dropdown({ open, onClose, trigger, align = 'left', className, children }) {
  const ref = useRef(null);
  useOutsideClick(ref, onClose, open);

  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 rounded-xl border border-warm-200 bg-white p-1.5 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}