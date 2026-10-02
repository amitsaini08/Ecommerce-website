import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function Logo({ tone = 'light', href = '/', className }) {
  const dark = tone === 'dark';

  return (
    <Link
      href={href}
      className={cn(
        'shrink-0 text-xl font-extrabold tracking-tight',
        dark ? 'text-white' : 'text-warm-900',
        className
      )}
    >
      Nova<span className={dark ? 'text-brand-400' : 'text-brand-500'}>Hub</span>
    </Link>
  );
}