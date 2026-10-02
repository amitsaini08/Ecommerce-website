import Link from 'next/link';
import Section from '@/components/common/Section';
import CategoryImage from '@/components/ui/CategoryImage';

export default function CategoryQuickNav({ categories = [] }) {
  if (!categories?.length) return null;

  return (
    <Section padding="sm" className="border-b border-warm-100">
      <div className="no-scrollbar flex items-center py-3 gap-5 overflow-x-auto sm:gap-7">
        {categories.map((cat) => (
          <Link
            key={cat._id || cat.id}
            href={`/categories/${cat.slug}`}
            className="group flex w-20 shrink-0 flex-col items-center gap-2"
          >
            <CategoryImage
              category={cat}
              className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-warm-400 group-hover:shadow-sm"
            />
            <span className="w-full truncate text-center text-xs font-medium text-warm-700 transition-colors group-hover:text-warm-900">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}