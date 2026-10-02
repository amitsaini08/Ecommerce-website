'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FolderTree, Package, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Section from '@/components/ui/Section';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import ActiveFilters from '@/components/ui/ActiveFilters';
import Drawer from '@/components/ui/Drawer';
import EmptyState from '@/components/ui/EmptyState';
import ProductGrid from '@/components/ui/ProductGrid';
import ProductCard from '@/components/ui/ProductCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import FilterPanel from '@/components/ui/FilterPanel';

const SKELETON_COUNT = 8;

const getEffectivePrice = (p) => {
  const price = Number(p.price);
  const discount = Number(p.discountPrice);
  return discount > 0 && discount < price ? discount : price;
};

export default function CategoryDetailPage() {
  const { slug } = useParams();

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // naye category par purane filters nahi chahiye
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);

    async function loadCategory() {
      setLoading(true);
      try {
        const res = await fetch(`/api/categories/${slug}`, { signal: controller.signal });
        const data = await res.json();

        if (res.ok) {
          setCategory(data.category);
          setSubcategories(data.subcategories || []);
          setProducts(data.products || []);
        } else {
          setCategory(null);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setCategory(null);
      }
      setLoading(false);
    }

    loadCategory();
    return () => controller.abort();
  }, [slug]);

  const filteredProducts = products.filter((p) => {
    const price = getEffectivePrice(p);
    if (minPrice && !isNaN(Number(minPrice)) && price < Number(minPrice)) return false;
    if (maxPrice && !isNaN(Number(maxPrice)) && price > Number(maxPrice)) return false;
    if (minRating && Number(p.ratingAvg || 0) < Number(minRating)) return false;
    if (inStockOnly && p.stock <= 0) return false;
    return true;
  });

  const hasFilters = Boolean(minPrice || maxPrice || minRating || inStockOnly);

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
  }

  const renderFilterPanel = (onDone) => (
    <FilterPanel
      minPrice={minPrice}
      maxPrice={maxPrice}
      minRating={minRating}
      inStockOnly={inStockOnly}
      setMinPrice={setMinPrice}
      setMaxPrice={setMaxPrice}
      onPriceFilter={() => onDone?.()}
      onRatingChange={(r) => {
        setMinRating(r);
        onDone?.();
      }}
      onInStockChange={(checked) => {
        setInStockOnly(checked);
        onDone?.();
      }}
      onClear={() => {
        clearFilters();
        onDone?.();
      }}
      hasFilters={hasFilters}
    />
  );

  if (loading) {
    return (
      <Section>
        <div className="space-y-6">
          <div className="h-4 w-40 animate-pulse rounded-lg bg-warm-100" />
          <div className="h-8 w-56 animate-pulse rounded-lg bg-warm-100" />
          <ProductGrid>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-warm-100" />
            ))}
          </ProductGrid>
        </div>
      </Section>
    );
  }

  if (!category) {
    return (
      <Section>
        <EmptyState
          icon={FolderTree}
          title="Category Not Found"
          description="The category you are looking for may have been removed or renamed."
          action={
            <Button href="/categories" variant="dark">
              Browse All Categories
            </Button>
          }
        />
      </Section>
    );
  }

  const count = filteredProducts.length;

  return (
    <Section>
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Categories', href: '/categories' },
            { label: category.name },
          ]}
        />

        <PageHeader
          title={category.name}
          subtitle={`Explore items in ${category.name} (${count} item${count !== 1 ? 's' : ''})`}
          actions={
            <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {hasFilters && <span className="h-2 w-2 rounded-full bg-brand-500" />}
            </Button>
          }
        />

        {subcategories.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-warm-700">
              <FolderTree className="h-4 w-4 text-warm-900" />
              Subcategories
            </h2>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {subcategories.map((sub) => (
                <Button
                  key={sub._id || sub.id} href={`/categories/${sub.slug}`}
                  variant="outline"  size="sm" pill
                  className="shrink-0 bg-white" >
                  {sub.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {hasFilters && (
          <ActiveFilters onClear={clearFilters}>
            {(minPrice || maxPrice) && (
              <Chip
                onRemove={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
              >
                Price: {formatCurrency(minPrice || 0)} – {maxPrice ? formatCurrency(maxPrice) : '∞'}
              </Chip>
            )}

            {minRating && (
              <Chip onRemove={() => setMinRating('')}>Rating: {minRating}★ &amp; above</Chip>
            )}

            {inStockOnly && <Chip onRemove={() => setInStockOnly(false)}>In Stock Only</Chip>}
          </ActiveFilters>
        )}

        <div className="flex gap-6">
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-warm-200 bg-white p-4 shadow-sm">
              {renderFilterPanel()}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {count > 0 ? (
              <ProductGrid>
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id || product.id} product={product} />
                ))}
              </ProductGrid>
            ) : (
              <EmptyState
                icon={Package}
                title="No products match filters"
                description="Try loosening your filter options or clear them to view all items."
                action={
                  hasFilters && (
                    <Button variant="dark" onClick={clearFilters}>
                      Clear All Filters
                    </Button>
                  )
                }
              />
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Options"
        icon={SlidersHorizontal}
        className="lg:hidden"
      >
        {renderFilterPanel(() => setShowFilters(false))}
      </Drawer>
    </Section>
  );
}