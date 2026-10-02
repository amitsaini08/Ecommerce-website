import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function MenuItem({ href, onClick, icon: Icon, leading, danger = false, className, children }) {
    const classes = cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-warm-700 hover:bg-warm-50 hover:text-warm-900',
        className
    );

    const content = (
        <>
            {leading ?? (Icon && <Icon className="h-4 w-4 shrink-0 text-warm-500" />)}
            <span className="truncate">{children}</span>
        </>
    );

    if (href) {
        return (
            <Link href={href} onClick={onClick} className={classes}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={classes}>
            {content}
        </button>
    );
}