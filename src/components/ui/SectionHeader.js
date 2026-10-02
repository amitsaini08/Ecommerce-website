import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SectionHeader({ title, subtitle, viewAllHref }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-warm-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-warm-500 mt-1">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline shrink-0"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
