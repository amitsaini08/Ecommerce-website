'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Folder, Search, X, Check, Loader2 } from 'lucide-react';
import { categoriesApi } from '@/lib/apiClient/categories';

const No_Exclude = new Set();
export default function CategoryTreeSelect({ value = [], onChange, placeholder = 'Select categories...', excludeIds = No_Exclude }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [childrenCache, setChildrenCache] = useState({});
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [labelsById, setLabelsById] = useState({});

  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLevel = useCallback(async (parentKey, { cursor = null, append = false } = {}) => {
    setChildrenCache((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || { items: [] }),
        loading: !append,
        loadingMore: append,
      },
    }));
    const params = new URLSearchParams();
    if (parentKey !== 'root') params.set('parentId', parentKey);
    if (cursor) params.set('cursor', cursor);
    try {
      const data = await categoriesApi.getAdmin(params.toString());
      setChildrenCache((prev) => {
        const existing = prev[parentKey]?.items || [];
        return {
          ...prev,
          [parentKey]: {
            items: append ? [...existing, ...(data.categories || [])] : data.categories || [],
            nextCursor: data.nextCursor || null,
            loading: false,
            loadingMore: false,
            loaded: true,
          },
        };
      });
    } catch {
      setChildrenCache((prev) => ({
        ...prev,
        [parentKey]: { ...(prev[parentKey] || { items: [] }), loading: false, loadingMore: false, loaded: true },
      }));
    }
  }, []);

  useEffect(() => {
    if (isOpen && !childrenCache.root?.loaded && !childrenCache.root?.loading) {
      queueMicrotask(() => fetchLevel('root'));
    }
  }, [isOpen, childrenCache.root, fetchLevel]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!search) {
      queueMicrotask(() => setSearchResults(null));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setSearchLoading(true));
    categoriesApi.getAdmin(`q=${encodeURIComponent(search)}`)
      .then((d) => {
        if (!cancelled) setSearchResults(d?.categories || []);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  useEffect(() => {
    const missing = value.filter((id) => id && !labelsById[id]);
    if (missing.length === 0) return;
    categoriesApi.getByIds(missing)
      .then((d) => {
        setLabelsById((prev) => {
          const next = { ...prev };
          (d?.categories || []).forEach((c) => {
            const cid = String(c._id || c.id);
            next[cid] = c.name;
          });
          return next;
        });
      })
      .catch(() => {});
  }, [value]);

  function toggleExpand(id) {
    const willExpand = !expandedIds.has(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      willExpand ? next.add(id) : next.delete(id);
      return next;
    });
    if (willExpand && !childrenCache[id]?.loaded && !childrenCache[id]?.loading) {
      fetchLevel(id);
    }
  }

  function toggleSelect(id, name) {
    if (name) setLabelsById((prev) => ({ ...prev, [id]: name }));
    const exists = value.includes(id);
    onChange(exists ? value.filter((v) => v !== id) : [...value, id]);
  }

  function buildVisibleRows() {
    const rows = [];
    function walk(parentKey, depth) {
      const level = childrenCache[parentKey];
      if (!level) return;
      (level.items || []).forEach((cat) => {
        const cid = String(cat._id || cat.id);
        if (excludeIds.has(cid)) return;
        const isExpanded = expandedIds.has(cid);
        rows.push({ ...cat, _id: cid, depth, rowKey: `${parentKey}-${cid}`, isExpanded });
        if (isExpanded) {
          if (childrenCache[cid]?.loading) {
            rows.push({ __skeleton: true, rowKey: `${cid}-skeleton`, depth: depth + 1 });
          } else {
            walk(cid, depth + 1);
          }
        }
      });
      if (level.loadingMore) {
        rows.push({ __skeleton: true, rowKey: `${parentKey}-loadmore-skeleton`, depth });
      } else if (level.nextCursor) {
        rows.push({ __loadMore: true, parentKey, cursor: level.nextCursor, rowKey: `${parentKey}-loadmore`, depth });
      }
    }
    walk('root', 0);
    return rows;
  }

  const inSearchMode = search.length > 0;
  const rows = inSearchMode
    ? (searchResults || []).filter((c) => !excludeIds.has(String(c._id || c.id))).map(c => ({ ...c, _id: String(c._id || c.id) }))
    : buildVisibleRows();
  const selectedChips = value.map((id) => ({ id, name: labelsById[id] })).filter((c) => c.name);

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selectedChips.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-warm-100 border border-warm-200 text-warm-700 font-semibold text-[10px] rounded-md">
              {cat.name}
              <X
                onClick={() => toggleSelect(cat.id)}
                className="w-3 h-3 cursor-pointer text-warm-400 hover:text-warm-800"
              />
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full px-3 py-1.5 bg-white border rounded-md text-left text-[11px] font-medium flex items-center justify-between transition-all ${
          isOpen ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-warm-200 hover:border-warm-300'
        }`}
      >
        <span className={value.length ? 'text-warm-900' : 'text-warm-400'}>
          {value.length > 0 ? `${value.length} selected` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-warm-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-warm-200 rounded-lg shadow-lg animate-fadeIn overflow-hidden">
          <div className="p-2 border-b border-warm-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                autoFocus
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400"
              />
            </div>
          </div>

          <div className="max-h-42 overflow-y-auto py-1">
            {inSearchMode && searchLoading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-warm-400">
                {!inSearchMode && !childrenCache.root?.loaded ? 'Loading categories...' : 'No categories found'}
              </div>
            ) : (
              rows.map((cat) => {
                if (cat.__skeleton) return <SkeletonRow key={cat.rowKey} depth={cat.depth} />;
                if (cat.__loadMore) {
                  return (
                    <button
                      key={cat.rowKey}
                      type="button"
                      onClick={() => fetchLevel(cat.parentKey, { cursor: cat.cursor, append: true })}
                      style={{ paddingLeft: 10 + cat.depth * 16 }}
                      className="w-full text-center bg-orange-100 px-5 m-auto py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-orange-200">
                      Load more...
                    </button>
                  );
                }
                const cid = String(cat._id || cat.id);
                const isSelected = value.includes(cid);
                return (
                  <div
                    key={inSearchMode ? cid : cat.rowKey}
                    onClick={() => toggleSelect(cid, cat.name)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-[11px] font-medium transition-colors ${
                      isSelected ? 'bg-brand-50/70' : 'hover:bg-warm-50'
                    }`}
                    style={{ paddingLeft: inSearchMode ? 10 : 10 + cat.depth * 16 }} >
                    {!inSearchMode && cat.hasChildren ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(cid);
                        }}
                        className="p-0.5 text-warm-400 hover:text-warm-900 shrink-0" >
                        {childrenCache[cid]?.loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : ( <ChevronRight className={`w-3 h-3 transition-transform ${cat.isExpanded ? 'rotate-90' : ''}`} /> )}
                      </span>
                    ) : ( <span className="w-4 shrink-0" />)}

                    <Folder className="w-3 h-3 text-warm-400 shrink-0" />

                    <span className="flex-1 truncate text-warm-800">
                      {inSearchMode ? cat.breadcrumb : cat.name}
                    </span>

                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonRow({ depth = 0 }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ paddingLeft: 10 + depth * 16 }}>
      <span className="w-4 shrink-0" />
      <div className="h-3 w-3 bg-warm-100 rounded animate-pulse shrink-0" />
      <div className="h-3 w-24 bg-warm-100 rounded animate-pulse" />
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      <SkeletonRow key="1" />
      <SkeletonRow key="2" />
      <SkeletonRow key="3" />
    </>
  );
}