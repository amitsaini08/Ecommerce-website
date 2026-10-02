import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/common/SectionHeader';
import Section from '@/components/common/Section';
import CategoryImage from '@/components/ui/CategoryImage';

export default function CategorySection({ categories = [] }) {
  if (!categories?.length) return null;

  return (
    <Section>
      <SectionHeader
        title="Browse by Category"
        subtitle="Explore our thoughtfully organized collections."
        viewAllHref="/categories"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat._id || cat.id}
            href={`/categories/${cat.slug}`}
            className="group flex flex-col items-center rounded-xl border border-warm-200 bg-warm-50 p-4 text-center transition-all duration-200 hover:border-warm-300 hover:shadow-sm"
          >
            <CategoryImage
              category={cat}
              size="lg"
              className="mb-2 bg-warm-100 transition-transform group-hover:scale-105"
            />
            <h3 className="line-clamp-1 text-sm font-semibold text-warm-900 transition-colors group-hover:text-brand-600">
              {cat.name}
            </h3>
            <span className="mt-1 flex items-center gap-1 text-xs text-warm-400 opacity-0 transition-opacity group-hover:text-brand-600 group-hover:opacity-100">
              Explore
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}