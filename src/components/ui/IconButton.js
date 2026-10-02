import Link from 'next/link';
import { cn } from '@/lib/cn';
import CountBadge from './CountBadge';

export default function IconButton({
  href,
  label,
  count = 0,
  badgeTone = 'brand',
  className,
  children,
  ...props
}) {
  const classes = cn(
    'relative inline-flex h-9 w-9 items-center justify-center rounded-full',
    'text-warm-600 transition-colors hover:bg-warm-50 hover:text-warm-900',
    className
  );

  const content = (
    <>
      {children}
      <CountBadge count={count} tone={badgeTone} />
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} className={classes} {...props}>
      {content}
    </button>
  );
}