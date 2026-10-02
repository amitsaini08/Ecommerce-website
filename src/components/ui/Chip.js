import { X } from 'lucide-react';

export default function Chip({ onRemove, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warm-200 bg-white py-1 pl-3 pr-1.5 text-xs font-medium text-warm-800">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="flex h-4 w-4 items-center justify-center rounded-full text-warm-400 transition-colors hover:bg-warm-100 hover:text-warm-900"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}