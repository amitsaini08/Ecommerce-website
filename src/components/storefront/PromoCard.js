import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';

const tones = {
    brand: {
        card: 'bg-gradient-to-br from-brand-600 via-brand-500 to-amber-500',
        chip: 'bg-white/20 text-white',
        text: 'text-white/90',
        button: { variant: 'light', className: 'text-brand-600 hover:bg-brand-50' },
        deco: 'bg-white/10',
    },
    dark: {
        card: 'bg-warm-900',
        chip: 'bg-brand-500/20 text-brand-300',
        text: 'text-warm-400',
        button: { variant: 'outlineLight', className: '' },
        deco: 'bg-brand-500/10',
    },
};

export default function PromoCard({
    tone = 'brand',
    icon: Icon,
    badge,
    title,
    description,
    ctaLabel,
    ctaHref,
    className,
}) {
    const t = tones[tone];

    return (
        <div
            className={cn(
                'relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-xl p-6 text-white shadow-sm',
                t.card,
                className
            )}
        >
            <div className="relative z-10">
                <span
                    className={cn(
                        'mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm',
                        t.chip
                    )}
                >
                    {Icon && <Icon className="h-3 w-3" />}
                    {badge}
                </span>
                <h3 className="mb-1.5 text-xl font-extrabold">{title}</h3>
                <p className={cn('mb-4 max-w-sm text-sm', t.text)}>{description}</p>
            </div>

            <Button
                href={ctaHref}
                pill
                variant={t.button.variant}
                className={cn('relative z-10 w-fit', t.button.className)}
            >
                <span>{ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
            </Button>

            <div className={cn('absolute -bottom-12 -right-12 h-40 w-40 rounded-full', t.deco)} />
        </div>
    );
}