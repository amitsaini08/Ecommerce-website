'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Check, Package, X, Folder, FolderTree } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import CategoryTreeSelect from '@/components/ui/CategoryTreeSelect';
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';


const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Regular price must be a positive number'),
  discountPrice: z.coerce.number().nonnegative('Sale price cannot be negative').nullable().optional(),
  stock: z.coerce.number().int('Available stock must be a whole number').nonnegative('Available stock cannot be negative'),
  images: z.array(z.string()).min(1, 'At least one product image is required'),
  productLink: z.string().url('Product link must be a valid URL').or(z.literal('')).optional(),
  isActive: z.boolean(),
  categoryIds: z.array(z.string()).optional(),
  codAvailable: z.boolean(),
  specifications: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ).optional(),
}).refine(
  (data) => data.discountPrice == null || data.discountPrice < data.price,
  { message: 'Sale price must be less than regular price', path: ['discountPrice'] }
);

export function flattenCategoriesWithDepth(categories) {
  const result = [];
  const renderedIds = new Set(); // tracks across the WHOLE tree, not per-branch

  function walk(parentId, depth) {
    const children = parentId === null
      ? categories.filter((c) => (c.parentIds || []).length === 0)
      : categories.filter((c) => (c.parentIds || []).includes(parentId));

    for (const cat of children) {
      if (renderedIds.has(cat.id)) continue; // already shown once — skip repeat
      renderedIds.add(cat.id);
      result.push({ ...cat, depth });
      walk(cat.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}


export default function NewProductPage() {
  return <ProductForm />;
}

function normalizeCategoryIds(categoryIds) {
  if (!Array.isArray(categoryIds)) return [];
  return categoryIds
    .map((c) => {
      if (!c) return '';
      if (typeof c === 'object') {
        const rawId = c._id || c.id || c;
        return String(rawId);
      }
      return String(c);
    })
    .filter(Boolean);
}

function getInitialFormState(initialData) {
  const normalizedCategoryIds = normalizeCategoryIds(initialData?.categoryIds);
  return {
    name: '',
    slug: '',
    description: '',
    price: '',
    discountPrice: '',
    stock: '0',
    images: [],
    specifications: [],
    productLink: '',
    isActive: true,
    codAvailable: true,
    ...initialData,
    categoryIds: normalizedCategoryIds,
  };
}

export function ProductForm({ initialData, productId }) {
  const router = useRouter();
  const toast = useToast();
  const isEditing = !!productId;
  const [loading, setLoading] = useState(false);


  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: getInitialFormState(initialData)
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'specifications' })

  const name = watch('name');

  useEffect(() => {
    const slug = name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? '';
    setValue('slug', slug);
  }, [name, setValue]);



  async function onSubmit(data) {
    setLoading(true);
    try {
      const url = isEditing ? `/api/admin/products/${productId}` : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
        router.push('/admin/products');
      } else {
        toast.error(result.error || 'Failed to save product');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="p-1.5 hover:bg-warm-100 rounded-md text-warm-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-warm-900">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-[11px] text-warm-500">
              {isEditing ? 'Update catalog details & inventory' : 'Create a new item in your store catalog'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-brand-600" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                // value={form.name}
                {...register('name')}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
                placeholder="e.g. Minimalist Leather Watch"
                
              />
              {errors.name && <p className="text-[10px] text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                {...register('slug')}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 font-mono focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
                placeholder="minimalist-leather-watch"
                
                />
            {errors.slug && <p className="text-[10px] text-red-600 mt-1">{errors.slug.message}</p>}
                </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">
              Description
            </label>
            <textarea

              {...register('description')}
              rows={4}
              className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 resize-none"
              placeholder="Detailed description of materials, sizing, features..."
            />
            {errors.description && <p className="text-[10px] text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">
              Product Link (Admin Reference / Supplier Link — Never shown to customers)
            </label>
            <input
              type="url"
              {...register('productLink')}
              className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 font-mono focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
              placeholder="https://supplier.com/product-source-link"
            />
            {errors.productLink && <p className="text-[10px] text-red-600 mt-1">{errors.productLink.message}</p>}
          </div>
        </div>

        {/* Section 2: Pricing & Category */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2">
            Pricing, Category & Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Regular Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register('price')}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                placeholder="99.99"
                
              />
              {errors.price && <p className="text-[10px] text-red-600 mt-1">{errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Sale Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register('discountPrice')}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                placeholder="79.99"
              />
              {errors.discountPrice && <p className="text-[10px] text-red-600 mt-1">{errors.discountPrice.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Available Stock *
              </label>
              <input
                type="number"
                {...register('stock')}
                min={0}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                
              />
              {errors.stock && <p className="text-[10px] text-red-600 mt-1">{errors.stock.message}</p>}
            </div>
          </div>

          {/* Categories — separate full-width row, not squeezed into the grid above */}
          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">
              Categories
            </label>
            <Controller
              name='categoryIds'
              control={control}
              render={({ field }) => (
                <CategoryTreeSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select categories..."
                />
              )}
            />
            {errors.categoryIds && <p className="text-[10px] text-red-600 mt-1">{errors.categoryIds.message}</p>}
          </div>

          <div className="flex flex-wrap gap-4 pt-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="accent-warm-900 w-3.5 h-3.5 rounded"
              />
              <span className="text-[11px] font-medium text-warm-800">
                Active (visible on storefront)
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('codAvailable')}
                className="accent-warm-900 w-3.5 h-3.5 rounded"
              />
              <span className="text-[11px] font-medium text-warm-800">
                Cash on Delivery Available
              </span>
            </label>
          </div>
        </div>

        {/* Section 3: Product Gallery (Image Upload) */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2">
            Product Images
          </h2>
          <Controller
            name="images"
            control={control}
            render={({ field }) => (
              <ImageUpload
                uploadType="product-image"
                value={field.value || []}
                onChange={field.onChange}
                multiple={true}
                maxFiles={8}
                label="Upload Product Photos"
              />
            )}
          />
          {errors.images && <p className="text-[10px] text-red-600 mt-1">{errors.images.message}</p>}
        </div>

        {/* Section 4: Specifications Key-Value Builder */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2">
            <div>
              <h2 className="text-[13px] font-bold text-warm-900">Technical Specifications</h2>
              <p className="text-[10px] text-warm-500">Custom key-value pairs (e.g. Material: Organic Cotton)</p>
            </div>
            <button
              type="button"
              onClick={() => append({ label: '', value: '' })}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-warm-100 text-warm-900 text-[11px] font-semibold rounded-md hover:bg-warm-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Spec Row</span>
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-4 border-2 border-dashed border-warm-100 rounded-md text-warm-400 text-[11px]">
              No specifications added yet. Click &quot;Add Spec Row&quot; to add details like Material, Weight, Dimensions, etc.
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Material)"
                    {...register(`specifications.${index}.label`)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 100% Cotton)"
                    {...register(`specifications.${index}.value`)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1.5 text-warm-400 hover:text-red-600 rounded-md transition-colors"
                    title="Remove specification">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-1.5">
          <Link
            href="/admin/products"
            className="px-3.5 py-2 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}