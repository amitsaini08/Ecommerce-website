import Link from 'next/link';
import Image from 'next/image';
import { connectToDatabase, Category } from '@/lib/db/models';
import { ArrowRight, Folder } from 'lucide-react';
import Section from '@/components/common/Section';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Categories — NovaHub',
  description: 'Browse all product categories at NovaHub.',
};

export default async function CategoriesPage() {
  let allCategories = [];
  try {
    await connectToDatabase();
    const raw = await Category.find().sort({ name: 1 }).lean();
    allCategories = JSON.parse(JSON.stringify(raw));
  } catch { }

  const rootCategories = allCategories.filter((c) => !c.parentIds || c.parentIds.length === 0);

  return (
    <Section padding="lg" className="bg-warm-50">
      <PageHeader
        title="All Categories"
        subtitle="Browse our curated collection of product categories."
        className="mb-6"
      />

      {rootCategories.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {rootCategories.map((cat) => (
            <Link
              key={cat._id}
              href={`/categories/${cat.slug}`}
              className="group relative aspect-[4/5] rounded-lg overflow-hidden bg-warm-100 border border-warm-100"
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl} alt={cat.name} fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 33vw, 16vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center text-warm-400">
                  <Folder className="w-6 h-6" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <h3 className="text-white font-bold text-[11px] mb-0.5 line-clamp-1">{cat.name}</h3>
                <span className="inline-flex items-center gap-0.5 text-white/80 text-[9px] font-medium group-hover:text-white transition-colors">
                  Shop Now <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <EmptyState
            icon={Folder}
            title="No categories yet. Check back soon!"
            description="We are working hard to add more categories to our store. Stay tuned for updates!"
            className="bg-transparent  h-60 flex items-center justify-center flex-col gap-1"
          />
        </>
      )}
    </Section>
  );
}