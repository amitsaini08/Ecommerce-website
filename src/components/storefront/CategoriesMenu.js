'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Grid } from 'lucide-react';
import { cn } from '@/lib/cn';
import Dropdown from '@/components/ui/Dropdown';
import MenuItem from '@/components/ui/MenuItem';
import Thumb from '@/components/ui/Thumb';

import { categoriesApi } from '@/lib/apiClient/categories';

export default function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await categoriesApi.getAll();
        setCategories(data?.categories || []);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const close = () => setOpen(false);

  return (
    <Dropdown
      open={open}
      onClose={close}
      className="w-64"
      trigger={
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-warm-600 transition-colors hover:bg-warm-50 hover:text-warm-900"
        >
          Categories
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      }
    >
      <div className="mb-1 flex items-center justify-between border-b border-warm-100 px-2.5 pb-2 pt-1">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-warm-900">
          <Grid className="h-3.5 w-3.5 text-brand-600" />
          All Categories
        </span>
        <Link
          href="/categories"
          onClick={close}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <p className="p-3 text-center text-sm text-warm-400">Loading categories...</p>
      ) : categories.length === 0 ? (
        <p className="p-3 text-center text-sm text-warm-400">No categories found</p>
      ) : (
        categories.slice(0, 8).map((cat) => (
          <MenuItem
            key={cat._id || cat.id}
            href={`/categories/${cat.slug}`}
            onClick={close}
            leading={<Thumb src={cat.imageUrl} />}
          >
            {cat.name}
          </MenuItem>
        ))
      )}
    </Dropdown>
  );
}