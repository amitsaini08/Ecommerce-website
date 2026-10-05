'use client';

import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/common/Toast';
import { Folder, Plus, Edit2, Trash2, X, Check, ChevronRight, Loader2 } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';
import CategoryTreeSelect from '@/components/admin/CategoryTreeSelect';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/ui/Button';
import { CategoryCreateEditForm } from '@/components/admin/CategoryCreateEditForm';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().trim().refine(
    (value) => value === '' || /^[a-z0-9-]+$/.test(value),
    'Slug can only contain lowercase letters, numbers, and hyphens'
  ),
});

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

import { categoriesApi } from '@/lib/apiClient/categories';
import { useMutation } from '@/hooks/useMutation';

export default function AdminCategoriesPage() {
  const toast = useToast();

  const [childrenCache, setChildrenCache] = useState({}); // { root: {...}, [catId]: {...} }
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = create mode
  const [parentNameCache, setParentNameCache] = useState({});
  const requestedParentIds = useRef(new Set()); // jo ids ek baar fetch ho chuki, dobara nahi

  const deleteMutation = useMutation((id) => categoriesApi.remove(id));

  function openCreate() {
    setEditingCategory(null);
    setFormOpen(true);
  }
  function openEdit(cat) {
    setEditingCategory(cat);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditingCategory(null);
  }

  // Parent names resolve (table ke "Parent Category" column ke liye)
  useEffect(() => {
    const allParentIds = Object.values(childrenCache).flatMap((lvl) =>
      (lvl.items || []).flatMap((c) => c.parentIds || [])
    );
    const missing = [...new Set(allParentIds)].filter(
      (id) => !parentNameCache[id] && !requestedParentIds.current.has(id)
    );
    if (missing.length === 0) return;
    missing.forEach((id) => requestedParentIds.current.add(id));

    categoriesApi
      .getByIds(missing)
      .then((d) =>
        setParentNameCache((prev) => {
          const next = { ...prev };
          (d?.categories || []).forEach((c) => { next[c._id || c.id] = c.name; });
          return next;
        })
      )
      .catch(() => {
        missing.forEach((id) => requestedParentIds.current.delete(id)); // retry allow
      });
  }, [childrenCache]);

  useEffect(() => {
    fetchLevel('root').finally(() => setLoading(false));
  }, []);

  async function fetchLevel(parentKey, { cursor = null, append = false } = {}) {
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
    params.set('limit', '5');

    try {
      const data = await categoriesApi.getAdmin(params.toString());
      setChildrenCache((prev) => ({
        ...prev,
        [parentKey]: {
          items: append ? [...(prev[parentKey]?.items || []), ...(data.categories || [])] : data.categories || [],
          nextCursor: data.nextCursor,
          loading: false,
          loadingMore: false,
          loaded: true,
        },
      }));
    } catch {
      setChildrenCache((prev) => ({
        ...prev,
        [parentKey]: {
          ...(prev[parentKey] || { items: [] }),
          loading: false,
          loadingMore: false,
          loaded: true,
        },
      }));
      toast.error('Failed to load categories');
    }
  }

  function refreshTree() {
    setChildrenCache({});
    setExpandedIds(new Set());
    setLoading(true);
    fetchLevel('root').finally(() => setLoading(false));
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await deleteMutation.run(id);
    if (res) {
      toast.success('Category deleted');
      refreshTree();
    }
  }

  function getParentNames(cat) {
    return (cat.parentIds || []).map((pid) => parentNameCache[pid]).filter(Boolean);
  }

  function toggleExpand(rowKey, catId) {
    const willExpand = !expandedIds.has(rowKey);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      willExpand ? next.add(rowKey) : next.delete(rowKey);
      return next;
    });
    if (willExpand && !childrenCache[catId]?.loaded && !childrenCache[catId]?.loading) {
      fetchLevel(catId);
    }
  }

  function getChildren(catId) {
    return childrenCache[catId]?.items || [];
  }

  function renderCategoryRow(c, depth, pathPrefix = 'root', visitedAncestors = new Set()) {
    const catId = c._id || c.id;
    const rowKey = `${pathPrefix}-${catId}`;
    const children = getChildren(catId);
    const parentNames = getParentNames(c);
    const isExpanded = expandedIds.has(rowKey);

    const isCircular = visitedAncestors.has(catId);
    const isMaxDepthExceeded = depth >= 10;
    const isLevelLoading = childrenCache[catId]?.loading;

    return (
      <Fragment key={rowKey}>
        <tr className="hover:bg-warm-50/50 transition-colors">
          <td className="px-3 py-2">
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
              {c.hasChildren && !isCircular && !isMaxDepthExceeded ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(rowKey, catId)}
                  disabled={isLevelLoading}
                  className="p-0.5 text-warm-400 hover:text-warm-900 shrink-0"
                >
                  {isLevelLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              {c.imageUrl ? (
                <div className="relative w-7 h-7 rounded-md overflow-hidden border border-warm-200 shrink-0">
                  <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="28px" />
                </div>
              ) : (
                <div className="w-7 h-7 bg-warm-100 rounded-md flex items-center justify-center text-warm-500 shrink-0">
                  <Folder className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="font-semibold text-warm-900">{c.name}</span>

              {isCircular && (
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded flex items-center gap-1 border border-rose-200">
                  ⚠️ circular reference detected
                </span>
              )}
              {isMaxDepthExceeded && !isCircular && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded flex items-center gap-1 border border-amber-200">
                  ⚠️ max depth reached (10+)
                </span>
              )}
              {children.length > 0 && !isCircular && (
                <span className="px-1.5 py-0.5 bg-warm-100 text-warm-500 text-[9px] font-semibold rounded">
                  {children.length}
                </span>
              )}
            </div>
          </td>
          <td className="px-3 py-2 text-warm-500 font-mono text-[10px]">{c.slug}</td>
          <td className="px-3 py-2 text-warm-600">
            {parentNames.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {parentNames.map((name) => (
                  <span
                    key={name}
                    className="px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 text-[9px] font-semibold rounded"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              '—'
            )}
          </td>
          <td className="px-3 py-2 text-right">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => openEdit(c)}
                className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                title="Edit category"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(catId, c.name)}
                className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete category"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>

        {isExpanded && !isCircular && !isMaxDepthExceeded && (
          <>
            {isLevelLoading ? (
              <>
                <SkeletonRow depth={depth + 1} />
                <SkeletonRow depth={depth + 1} />
              </>
            ) : (
              children.map((child) =>
                renderCategoryRow(child, depth + 1, rowKey, new Set([...visitedAncestors, catId]))
              )
            )}
            {childrenCache[catId]?.loadingMore ? (
              <SkeletonRow depth={depth + 1} />
            ) : (
              childrenCache[catId]?.nextCursor && (
                <tr>
                  <td colSpan={4} style={{ paddingLeft: (depth + 1) * 20 + 12 }} className="py-1.5">
                    <button
                      type="button"
                      onClick={() => fetchLevel(catId, { cursor: childrenCache[catId].nextCursor, append: true })}
                      className="text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      Load more...
                    </button>
                  </td>
                </tr>
              )
            )}
          </>
        )}
      </Fragment>
    );
  }

  const rootItems = childrenCache.root?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Category Management</h1>
          <p className="text-[11px] text-warm-500">Organize store products into logical groups</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs" >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Category</span>
        </button>
      </div>

      {formOpen && (
        <CategoryCreateEditForm
          category={editingCategory}
          onClose={closeForm}
          onSaved={() => { closeForm(); refreshTree(); }}
        />
      )}

      <div className="bg-white rounded-md border border-warm-200 overflow-hidden shadow-xs">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/80 text-warm-600 text-[10px] font-semibold border-b border-warm-200">
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Parent Category</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-warm-400">Loading categories...</td>
              </tr>
            ) : rootItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-warm-400">
                  No categories found. Click &quot;Add Category&quot; to create one.
                </td>
              </tr>
            ) : (
              <>
                {rootItems.map((c) => renderCategoryRow(c, 0))}
                {childrenCache.root?.loadingMore ? (
                  <SkeletonRow depth={0} />
                ) : (
                  childrenCache.root?.nextCursor && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => fetchLevel('root', { cursor: childrenCache.root.nextCursor, append: true })}
                          className="text-[11px] bg-orange-100 w-full py-2 cursor-pointer rounded-md font-semibold text-brand-600 hover:underline"
                        >
                          Load more...
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkeletonRow({ depth = 0 }) {
  return (
    <tr>
      <td colSpan={4} className="px-3 py-2">
        <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
          <span className="w-4 shrink-0" />
          <div className="w-7 h-7 bg-warm-100 rounded-md animate-pulse shrink-0" />
          <div className="h-3 w-32 bg-warm-100 rounded animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

