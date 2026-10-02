'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Section from '@/components/common/Section';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Drawer from '@/components/common/Drawer';
import EmptyState from '@/components/common/EmptyState';
import ProductGrid from '@/components/product/ProductGrid';
import ProductCard from '@/components/product/ProductCard';
import Pagination from '@/components/common/Pagination';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/storefront/FilterPanel';
import ActiveFilters from '@/components/common/ActiveFilters';
import { categoriesApi } from '@/lib/apiClient/categories';
import { productsApi } from '@/lib/apiClient/products';

const PAGE_SIZE = 12;

const sortOptions = [
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
  { label: 'Best Sellers', value: 'best-sellers' },
];

const SORT_COPY = {
  newest: ['New Arrivals', 'Discover the latest additions to our storefront'],
  'best-sellers': ['Best Sellers', 'Browse our top-rated customer favorite products'],
};

const EMPTY_DATA = { products: [], pagination: { page: 1, totalPages: 1, total: 0 } };

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategory = searchParams.get('category') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentInStockOnly = searchParams.get('inStockOnly') === 'true';

  const requestKey = searchParams.toString();

  const cacheRef = useRef(new Map());
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  useEffect(() => {
    queueMicrotask(() => {
      setMinPrice(currentMinPrice);
      setMaxPrice(currentMaxPrice);
    });
  }, [currentMinPrice, currentMaxPrice]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const json = await categoriesApi.getAll();
        setCategories(json?.categories || []);
      } catch {
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    const cached = cacheRef.current.get(requestKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams(requestKey);
        params.set('limit', String(PAGE_SIZE));
        if (!params.get('page')) params.set('page', '1');
        if (!params.get('sort')) params.set('sort', 'newest');

        const json = await productsApi.getAll(params.toString(), { signal: controller.signal });

        const next = {
          products: json?.products || [],
          pagination: json?.pagination || EMPTY_DATA.pagination,
        };
        cacheRef.current.set(requestKey, next);
        setData(next);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setData(EMPTY_DATA);
      }
      setLoading(false);
    }

    loadProducts();
    return () => controller.abort();
  }, [requestKey]);

  const { products, pagination } = data;

  function updateFilters(updates, options = {}) {
    const params = new URLSearchParams(searchParams);
    let hasChanges = false;

    Object.entries(updates).forEach(([key, value]) => {
      const currentValue = searchParams.get(key) || '';
      const nextValue = value == null ? '' : String(value);
      if (currentValue !== nextValue) hasChanges = true;
      if (value == null || value === '') params.delete(key);
      else params.set(key, String(value));
    });

    if (!hasChanges) return;

    if (!('page' in updates)) params.set('page', '1');
    router.push(`/products?${params.toString()}`, { scroll: options.scroll ?? true });
  }

  function handlePriceFilter() {
    updateFilters({
      minPrice: minPrice.trim() || null,
      maxPrice: maxPrice.trim() || null,
    });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    router.push('/products');
  }

  const selectedCategory = categories.find((c) => c.slug === currentCategory);
  const hasFilters = Boolean(
    currentCategory || currentMinPrice || currentMaxPrice || currentMinRating || currentInStockOnly
  );

  const [title, blurb] = selectedCategory
    ? [selectedCategory.name, `Explore our collection of ${selectedCategory.name.toLowerCase()} items`]
    : SORT_COPY[currentSort] ?? ['All Products', 'Explore quality curated items for your home and lifestyle'];

  const renderFilterPanel = (onDone) => (
    <FilterPanel
      minPrice={minPrice}
      maxPrice={maxPrice}
      minRating={currentMinRating}
      inStockOnly={currentInStockOnly}
      setMinPrice={setMinPrice}
      setMaxPrice={setMaxPrice}
      onPriceFilter={() => {
        handlePriceFilter();
        onDone?.();
      }}
      onRatingChange={(r) => {
        updateFilters({ minRating: r || null });
        onDone?.();
      }}
      onInStockChange={(checked) => {
        updateFilters({ inStockOnly: checked ? 'true' : null });
        onDone?.();
      }}
      onClear={() => {
        clearFilters();
        onDone?.();
      }}
      hasFilters={hasFilters}
    />
  );

  return (
    <Section>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: title, href: '/products' }]} />

        <PageHeader
          title={title}
          subtitle={`${blurb} (${pagination.total} total)`}
          actions={
            <>
              <Button
                variant="outline"
                className="lg:hidden"
                onClick={() => setShowFilters(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {hasFilters && <span className="h-2 w-2 rounded-full bg-brand-500" />}
              </Button>

              <div className="w-44 sm:w-48">
                <CustomSelect
                  options={sortOptions}
                  value={currentSort}
                  onChange={(val) => updateFilters({ sort: val })}
                />
              </div>
            </>
          }
        />

        {hasFilters && (
         <ActiveFilters onClear={clearFilters}>

            {currentCategory && (
              <Chip onRemove={() => updateFilters({ category: null })}>
                Category: {selectedCategory?.name || currentCategory}
              </Chip>
            )}

            {(currentMinPrice || currentMaxPrice) && (
              <Chip
                onRemove={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  updateFilters({ minPrice: null, maxPrice: null });
                }}
              >
                Price: {formatCurrency(currentMinPrice || 0)} – {currentMaxPrice ? formatCurrency(currentMaxPrice) : '∞'}
              </Chip>
            )}

            {currentMinRating && (
              <Chip onRemove={() => updateFilters({ minRating: null })}>
                Rating: {currentMinRating}★ &amp; above
              </Chip>
            )}

            {currentInStockOnly && (
              <Chip onRemove={() => updateFilters({ inStockOnly: null })}>In Stock Only</Chip>
            )}

          </ActiveFilters>
        )}

        <div className="flex gap-6">
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-warm-200 bg-white p-4 shadow-sm">
              {renderFilterPanel()}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {loading ? (
              <ProductGrid>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-warm-100" />
                ))}
              </ProductGrid>
            ) : products.length > 0 ? (
              <>
                <ProductGrid>
                  {products.map((product) => (
                    <ProductCard key={product._id || product.id} product={product} />
                  ))}
                </ProductGrid>

                {pagination.totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) =>
                        updateFilters({ page: String(page) }, { scroll: false })
                      }
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Package}
                title="No products match your criteria"
                description="Try loosening your filter criteria to view more items."
                action={
                  <Button variant="dark" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Section>
          <div className="h-7 w-48 animate-pulse rounded-lg bg-warm-100" />
        </Section>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}