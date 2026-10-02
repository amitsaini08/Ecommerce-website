'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import Pagination from '@/components/common/Pagination';
import Section from '@/components/common/Section';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/storefront/FilterPanel';
import { formatCurrency } from '@/lib/utils';
import { Search, Filter, X, SlidersHorizontal, Package } from 'lucide-react';
import { categoriesApi } from '@/lib/apiClient/categories';
import { searchApi } from '@/lib/apiClient/search';

const sortOptions = [
  { label: 'Relevance', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategory = searchParams.get('category') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentInStockOnly = searchParams.get('inStockOnly') === 'true';
  const page = parseInt(searchParams.get('page') || '1');

  const filterKey = JSON.stringify({
    query,
    sort: currentSort,
    category: currentCategory,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    minRating: currentMinRating,
    inStockOnly: currentInStockOnly,
  });

  // { [page]: { products, pagination, categories } } — plain state, no ref/Map
  const [pagesCache, setPagesCache] = useState({});
  const [lastFilterKey, setLastFilterKey] = useState('');

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  async function fetchCategories() {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data?.categories || []);
    } catch { }
  }

  useEffect(() => {
    queueMicrotask(() => {
      setMinPrice(currentMinPrice);
      setMaxPrice(currentMaxPrice);
    });
  }, [currentMinPrice, currentMaxPrice]);

  useEffect(() => {
    queueMicrotask(() => fetchCategories());
  }, []);

  // Whenever filters/search/sort change, wipe the page-cache (old pages are
  // for a different filter combo, no longer valid)
  useEffect(() => {
    if (lastFilterKey && lastFilterKey !== filterKey) {
      queueMicrotask(() => setPagesCache({}));
    }
    queueMicrotask(() => setLastFilterKey(filterKey));
  }, [filterKey, lastFilterKey]);

  useEffect(() => {
    // Page already cached for this filter combo
    const cached = pagesCache[page];
    if (cached) {
      queueMicrotask(() => {
        setPagination(cached.pagination);
        setLoading(false);
      });
      return;
    }

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', '12');
    params.set('sort', currentSort);
    if (currentCategory) params.set('category', currentCategory);
    if (currentMinPrice) params.set('minPrice', currentMinPrice);
    if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);
    if (currentMinRating) params.set('minRating', currentMinRating);
    if (currentInStockOnly) params.set('inStockOnly', 'true');

    let cancelled = false;

    async function search() {
      setLoading(true);
      try {
        const data = await searchApi.search(params.toString());
        if (cancelled) return;

        const entry = {
          products: data?.products || [],
          pagination: data?.pagination || { page: 1, totalPages: 1, total: 0 },
          categories: data?.categories || [],
        };

        setPagesCache((prev) => ({ ...prev, [page]: entry }));
        setPagination(entry.pagination);
      } catch (error) {
        if (!cancelled) console.error('Search failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    search();
    return () => { cancelled = true; };
  }, [filterKey, page, pagesCache]);

  function updateFilters(updates) {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
      params.set('page', '1');
    }
    router.push(`/search?${params.toString()}`);
  }

  function handlePriceFilter() {
    const cleanMin = minPrice ? minPrice.trim() : '';
    const cleanMax = maxPrice ? maxPrice.trim() : '';
    updateFilters({ minPrice: cleanMin || null, maxPrice: cleanMax || null });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`/search?${params.toString()}`, { scroll: false });
  }

  const hasFilters = Boolean(currentCategory || currentMinPrice || currentMaxPrice || currentMinRating || currentInStockOnly);
  const selectedCategoryObj = categories.find((c) => c.slug === currentCategory);

  const currentEntry = pagesCache[page];
  const products = currentEntry?.products || [];
  const matchingCategories = currentEntry?.categories || [];

  return (
    <Section>
      <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Search' }]} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-warm-900 tracking-tight">
            {query ? `Search results for "${query}"` : 'Search Products'}
          </h1>
          <p className="text-xs sm:text-sm text-warm-500 mt-1">
            {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 border border-warm-200 rounded-lg text-xs font-semibold text-warm-700 bg-white hover:bg-warm-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-warm-600" />
            <span>Filters</span>
            {hasFilters && <span className="w-2 h-2 bg-brand-600 rounded-full" />}
          </button>

          <div className="w-48 sm:w-56">
            <CustomSelect
              options={sortOptions}
              value={currentSort}
              onChange={(val) => updateFilters({ sort: val })}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap bg-warm-50 p-3 rounded-xl border border-warm-200/60">
          <span className="text-xs font-bold text-warm-700 uppercase tracking-wider mr-1">
            Active Filters:
          </span>

          {currentCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-200 rounded-md text-xs font-semibold text-warm-800 shadow-2xs">
              Category: {selectedCategoryObj?.name || currentCategory}
              <button onClick={() => updateFilters({ category: null })} className="text-warm-400 hover:text-warm-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

            {(currentMinPrice || currentMaxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-200 rounded-md text-xs font-semibold text-warm-800 shadow-2xs">
                Price: {formatCurrency(currentMinPrice || 0)} – {currentMaxPrice ? formatCurrency(currentMaxPrice) : '∞'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  updateFilters({ minPrice: null, maxPrice: null });
                }}
                className="text-warm-400 hover:text-warm-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {currentMinRating && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-200 rounded-md text-xs font-semibold text-warm-800 shadow-2xs">
              Rating: {currentMinRating}★ &amp; above
              <button onClick={() => updateFilters({ minRating: null })} className="text-warm-400 hover:text-warm-900 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {currentInStockOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-200 rounded-md text-xs font-semibold text-warm-800 shadow-2xs">
              In Stock Only
              <button onClick={() => updateFilters({ inStockOnly: null })} className="text-warm-400 hover:text-warm-900 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          <button onClick={clearFilters} className="text-xs font-bold text-brand-600 hover:text-brand-700 ml-auto hover:underline cursor-pointer">
            Clear All
          </button>
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white border border-warm-200 rounded-xl p-5 shadow-xs sticky top-24">
            <FilterPanel
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={currentMinRating}
              inStockOnly={currentInStockOnly}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              onPriceFilter={handlePriceFilter}
              onRatingChange={(r) => updateFilters({ minRating: r || null })}
              onInStockChange={(st) => updateFilters({ inStockOnly: st ? 'true' : null })}
              onClear={clearFilters}
              hasFilters={hasFilters}
            />
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-6">
          {matchingCategories.length > 0 && (
            <div className="p-4 bg-white border border-warm-200 rounded-xl shadow-2xs">
              <h3 className="text-xs font-bold text-warm-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand-600" /> Matching Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchingCategories.slice(0, 5).map((cat) => (
                  <Link
                    key={cat._id || cat.id}
                    href={`/categories/${cat.slug}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-warm-50 border border-warm-200 rounded-lg text-xs font-semibold text-warm-800 hover:border-brand-500 hover:text-brand-600 transition-all shadow-2xs"
                  >
                    {cat.imageUrl && <img src={cat.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />}
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-warm-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                {products.map((product) => (
                  <ProductCard key={product._id || product.id} product={product} />
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(p) => updateFilters({ page: p.toString() })}
                  />
                </div>
              )}
            </>
          ) : query ? (
            <div className="bg-white border border-warm-200 rounded-xl p-12 text-center my-6">
              <Search className="w-12 h-12 mx-auto text-warm-300 mb-3" />
              <h3 className="text-base font-bold text-warm-900 mb-1">No products found matching &quot;{query}&quot;</h3>
              <p className="text-xs text-warm-500 max-w-sm mx-auto mb-6">
                Check for spelling errors or try searching with more general keywords or clearing filters.
              </p>
              <Link href="/products" className="px-5 py-2.5 bg-warm-900 text-white text-xs font-semibold rounded-lg hover:bg-warm-800 transition-colors inline-block">
                Browse All Products
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-warm-200 rounded-xl p-12 text-center my-6">
              <Search className="w-12 h-12 mx-auto text-warm-300 mb-3" />
              <h3 className="text-base font-bold text-warm-900 mb-1">Type a keyword to start searching</h3>
              <p className="text-xs text-warm-500 max-w-sm mx-auto mb-6">
                Search by product name, category, or description.
              </p>
              <Link href="/products" className="px-5 py-2.5 bg-warm-900 text-white text-xs font-semibold rounded-lg hover:bg-warm-800 transition-colors inline-block">
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-warm-100 pb-4 mb-6">
                <h3 className="text-base font-bold text-warm-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-600" /> Filter Options
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-1.5 text-warm-400 hover:text-warm-900 rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterPanel
                minPrice={minPrice}
                maxPrice={maxPrice}
                minRating={currentMinRating}
                inStockOnly={currentInStockOnly}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                onPriceFilter={() => {
                  handlePriceFilter();
                  setShowFilters(false);
                }}
                onRatingChange={(r) => {
                  updateFilters({ minRating: r || null });
                  setShowFilters(false);
                }}
                onInStockChange={(st) => {
                  updateFilters({ inStockOnly: st ? 'true' : null });
                  setShowFilters(false);
                }}
                onClear={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
                hasFilters={hasFilters}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </Section>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="h-6 w-48 bg-warm-100 rounded animate-pulse" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}