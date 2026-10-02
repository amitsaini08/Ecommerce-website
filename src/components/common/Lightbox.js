'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { isVideoUrl } from '@/lib/utils';

export default function Lightbox({ url, onClose }) {
  useEffect(() => {
    if (!url) return;

    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl overflow-hidden rounded-xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black"
        >
          <X className="h-5 w-5" />
        </button>

        {isVideoUrl(url) ? (
          <video src={url} controls autoPlay className="mx-auto max-h-[80vh] w-auto" />
        ) : (
          <img src={url} alt="" className="mx-auto max-h-[80vh] w-auto object-contain" />
        )}
      </div>
    </div>
  );
}