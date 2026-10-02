'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Grid, Package } from 'lucide-react';
import { debounce } from '@/lib/debounce';
import { formatCurrency } from '@/lib/utils';
import Thumb from '@/components/ui/Thumb';

import { searchApi } from '@/lib/apiClient/search';

function GroupLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-warm-400">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

export default function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  const searchProducts = useMemo(
    () =>
      debounce(async (searchQuery) => {
        setLoading(true);
        try {
          const data = await searchApi.search(`q=${encodeURIComponent(searchQuery)}&limit=6`);
          setResults({ categories: data?.categories || [], products: data?.products || [] });
        } catch {
          setResults({ categories: [], products: [] });
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      queueMicrotask(() => {
        setResults({ categories: [], products: [] });
        setLoading(false);
      });
      return;
    }
    searchProducts(trimmed);
  }, [query, searchProducts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const hasResults = results.categories.length > 0 || results.products.length > 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 mt-16 sm:mx-auto sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideDown 0.3s ease-out' }}
      >
        <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
          <form onSubmit={handleSubmit} className="flex items-center border-b border-warm-100 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-warm-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products or categories..."
              className="flex-1 px-3 py-1 text-sm text-warm-900 outline-none placeholder:text-warm-400"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="rounded-full p-1.5 text-warm-400 hover:bg-warm-50 hover:text-warm-600"
            >
              <X className="h-5 w-5" />
            </button>
          </form>

          {query.trim() && (
            <div className="max-h-96 divide-y divide-warm-100 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-warm-400">Searching...</div>
              ) : hasResults ? (
                <>
                  {results.categories.length > 0 && (
                    <div className="py-2">
                      <GroupLabel icon={Grid}>Categories</GroupLabel>
                      {results.categories.slice(0, 5).map((cat) => (
                        <Link
                          key={cat._id || cat.id}
                          href={`/categories/${cat.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-warm-50"
                        >
                          <Thumb src={cat.imageUrl} />
                          <span className="text-sm font-medium text-warm-800">{cat.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {results.products.length > 0 && (
                    <div className="py-2">
                      <GroupLabel icon={Package}>Products</GroupLabel>
                      {results.products.map((product) => (
                        <Link
                          key={product._id || product.id}
                          href={`/products/${product.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-warm-50"
                        >
                          <Thumb src={product.images?.[0]} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-warm-900">{product.name}</p>
                            <p className="text-xs font-semibold text-brand-600">
                             {formatCurrency(product.discountPrice || product.price)}
                            </p>
                          </div>
                          {product.category?.name && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                              {product.category.name}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-sm text-warm-400">
                  No matching categories or products found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}