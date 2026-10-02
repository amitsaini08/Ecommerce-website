import Button from './Button';

export default function ActiveFilters({ onClear, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warm-200 bg-warm-50 p-3">
      <span className="text-xs font-bold uppercase tracking-wider text-warm-700">
        Active Filters:
      </span>
      {children}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto text-brand-600 hover:text-brand-700"
      >
        Clear All
      </Button>
    </div>
  );
}