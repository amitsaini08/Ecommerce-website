import Link from 'next/link';
import { cn } from '@/lib/cn';

const variants = {
  desktop: 'px-3 py-2 text-sm',
  mobile: 'block px-3 py-3 text-sm',
};

export default function NavLink({ href, variant = 'desktop', className, children, ...props }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg font-medium text-warm-600 transition-colors hover:bg-warm-50 hover:text-warm-900',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}