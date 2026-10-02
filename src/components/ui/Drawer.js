'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function Drawer({ open, onClose, title, icon: Icon, className, children }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 z-[70]', className)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 z-10 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-warm-100 pb-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-warm-900">
            {Icon && <Icon className="h-4 w-4 text-brand-600" />}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-warm-400 transition-colors hover:bg-warm-50 hover:text-warm-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}