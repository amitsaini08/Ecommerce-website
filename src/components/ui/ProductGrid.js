import { cn } from '@/lib/cn';

const variants = {
  default: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  wide: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export default function ProductGrid({ variant = 'default', className, children }) {
  return <div className={cn('grid gap-4 sm:gap-6', variants[variant], className)}>{children}</div>;
}