import { cn } from '@/lib/cn';

export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div
      className={cn( 'flex flex-col justify-between gap-3 border-b border-warm-200 pb-4 sm:flex-row sm:items-end',
        className )} >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-warm-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-warm-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}