import Link from 'next/link';
import { cn } from '@/lib/cn';
import Spinner from './Spinner';

const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  dark: 'bg-warm-900 text-white hover:bg-warm-800',
  light: 'bg-white text-warm-900 hover:bg-warm-100',
  outline: 'border border-warm-300 text-warm-800 hover:bg-warm-50',
  outlineLight: 'border-2 border-white/30 text-white hover:bg-white hover:text-warm-900',
  ghost: 'text-warm-700 hover:bg-warm-50',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  href,
  variant = 'primary',
  size = 'md',
  pill = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-1.5 font-semibold transition-all',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    pill ? 'rounded-full' : 'rounded-lg',
    variants[variant],
    sizes[size],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="border-current/30 border-t-current" />}
      {children}
    </button>
  );
}