import { cn } from '@/lib/cn';

export default function Card({ title, description, actions, className, children }) {
  return (
    <section className={cn('rounded-xl border border-warm-200 bg-white p-5 shadow-sm', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-warm-100 pb-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-warm-900">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-warm-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}