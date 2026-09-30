'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ui/ProductCard';
import Pagination from '@/components/ui/Pagination';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/ui/FilterPanel';
import { Search, Filter, X, SlidersHorizontal, Package } from 'lucide-react';

const sortOptions = [
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
  { label: 'Best Sellers', value: 'best-sellers' },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategory = searchParams.get('category') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentInStockOnly = searchParams.get('inStockOnly') === 'true';
  const currentPage = parseInt(searchParams.get('page') || '1');

  const filterKey = JSON.stringify({
    sort: currentSort,
    category: currentCategory,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    minRating: currentMinRating,
    inStockOnly: currentInStockOnly,
  });

  const [pagesCache, setPagesCache] = useState({});
  const [lastFilterKey, setLastFilterKey] = useState('');

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  useEffect(() => {
    setMinPrice(currentMinPrice);
    setMaxPrice(currentMaxPrice);
  }, [currentMinPrice, currentMaxPrice]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (lastFilterKey && lastFilterKey !== filterKey) {
      setPagesCache({});
    }
    setLastFilterKey(filterKey);
  }, [filterKey]);

  useEffect(() => {
    const cached = pagesCache[currentPage];
    if (cached) {
      setPagination(cached.pagination);
      setLoading(false);
      return;
    }
    fetchProducts();
  }, [filterKey, currentPage, pagesCache]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '12');
      params.set('sort', currentSort);
      if (currentCategory) params.set('category', currentCategory);
      if (currentMinPrice) params.set('minPrice', currentMinPrice);
      if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);
      if (currentMinRating) params.set('minRating', currentMinRating);
      if (currentInStockOnly) params.set('inStockOnly', 'true');

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();

      setPagesCache((prev) => ({
        ...prev,
        [data.pagination.page]: { products: data.products, pagination: data.pagination },
      }));
      setPagination(data.pagination);
    } catch { }
    setLoading(false);
  }

  const currentProducts = pagesCache[currentPage]?.products || [];

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
    const cleanMin = minPrice ? minPrice.trim() : '';
    const cleanMax = maxPrice ? maxPrice.trim() : '';
    updateFilters({ minPrice: cleanMin || null, maxPrice: cleanMax || null });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    router.push('/products');
  }



  const selectedCategoryObj = categories.find((c) => c.slug === currentCategory);
  const hasFilters = Boolean(currentCategory || currentMinPrice || currentMaxPrice || currentMinRating || currentInStockOnly);

  const pageTitle = selectedCategoryObj
    ? selectedCategoryObj.name
    : currentSort === 'newest'
      ? 'New Arrivals'
      : currentSort === 'best-sellers'
        ? 'Best Sellers'
        : 'All Products';

  const pageSubtitle = selectedCategoryObj
    ? `Explore our collection of ${selectedCategoryObj.name.toLowerCase()} items (${pagination.total} total)`
    : currentSort === 'newest'
      ? `Discover the latest additions to our storefront (${pagination.total} total)`
      : currentSort === 'best-sellers'
        ? `Browse our top-rated customer favorite products (${pagination.total} total)`
        : `Explore quality curated items for your home and lifestyle (${pagination.total} total)`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <Breadcrumbs items={[{ label: pageTitle, href: '/products' }]} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-warm-200/80 pb-3">
        <div>
          <h1 className="text-md font-bold text-warm-900 tracking-tight">{pageTitle}</h1>
          <p className="text-[11px] text-warm-500 mt-0.5">{pageSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] font-semibold text-warm-700 bg-white hover:bg-warm-50 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5 text-warm-600" />
            <span>Filters</span>
            {hasFilters && <span className="w-1.5 h-1.5 bg-brand-600 rounded-full" />}
          </button>

          <div className="w-40 sm:w-44">
            <CustomSelect options={sortOptions} value={currentSort} onChange={(val) => updateFilters({ sort: val })} />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap bg-warm-50 p-2 rounded-lg border border-warm-200/60">
          <span className="text-[10px] font-bold text-warm-700 uppercase tracking-wider mr-0.5">Active Filters:</span>

          {currentCategory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Category: {selectedCategoryObj?.name || currentCategory}
              <button onClick={() => updateFilters({ category: null })} className="text-warm-400 hover:text-warm-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(currentMinPrice || currentMaxPrice) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Price: ${currentMinPrice || '0'} – ${currentMaxPrice || '∞'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  updateFilters({ minPrice: null, maxPrice: null });
                }}
                className="text-warm-400 hover:text-warm-900 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentMinRating && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Rating: {currentMinRating}★ &amp; above
              <button onClick={() => updateFilters({ minRating: null })} className="text-warm-400 hover:text-warm-900 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentInStockOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              In Stock Only
              <button onClick={() => updateFilters({ inStockOnly: null })} className="text-warm-400 hover:text-warm-900 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button onClick={clearFilters} className="text-[10px] font-bold text-brand-600 hover:text-brand-700 ml-auto hover:underline cursor-pointer">
            Clear All
          </button>
        </div>
      )}

      <div className="flex gap-5">
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="bg-white border border-warm-200 rounded-lg p-3 shadow-xs sticky top-20">
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

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-warm-100 rounded-md animate-pulse" />
              ))}
            </div>
          ) : currentProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-6 gap-3">
                {currentProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => updateFilters({ page: page.toString() }, { scroll: false })}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-warm-200 rounded-lg p-8 text-center my-4">
              <Package className="w-8 h-8 mx-auto text-warm-300 mb-2" />
              <h3 className="text-sm font-bold text-warm-900 mb-1">No products match your criteria</h3>
              <p className="text-[11px] text-warm-500 max-w-sm mx-auto mb-4">
                Try loosening your filter criteria to view more items.
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-warm-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-warm-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-brand-600" /> Filter Options
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-1 text-warm-400 hover:text-warm-900 rounded-md cursor-pointer">
                  <X className="w-4 h-4" />
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
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-6 w-48 bg-warm-100 rounded animate-pulse" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}