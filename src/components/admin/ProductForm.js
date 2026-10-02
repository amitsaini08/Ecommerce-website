'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/Toast';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Check, Package } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';
import CategoryTreeSelect from '@/components/admin/CategoryTreeSelect';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Input from '../ui/Input';

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
  ) .transform((rows) => rows.filter((r) => r.label && r.value)).optional(),
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
      : categories.filter((c) => (c.parentIds || []).map(String).includes(String(parentId)));

    for (const cat of children) {
      const catId = cat._id || cat.id;
      if (renderedIds.has(String(catId))) continue; // already shown once — skip repeat
      renderedIds.add(String(catId));
      result.push({ ...cat, depth });
      walk(catId, depth + 1);
    }
  }

  walk(null, 0);
  return result;
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
const COMPACT = 'h-8 text-[11px]';
import { productsApi } from '@/lib/apiClient/products';
import { useMutation } from '@/hooks/useMutation';

export function ProductForm({ initialData, productId }) {
  const router = useRouter();
  const toast = useToast();
  const isEditing = !!productId;

  const saveMutation = useMutation((data) => productsApi.save(productId, data));

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: getInitialFormState(initialData),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'specifications' });

  const name = watch('name');

  // Auto-slug only for new products, so editing never changes a live URL
  useEffect(() => {
    if (isEditing) return;
    const slug = (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setValue('slug', slug);
  }, [name, isEditing, setValue]);

  async function onSubmit(data) {
    const res = await saveMutation.run(data);
    if (res) {
      toast.success(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
      router.push('/admin/products');
    }
  }

  const saveLabel = isEditing ? 'Update Product' : 'Save Product';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-md p-1.5 text-warm-600 transition-colors hover:bg-warm-100"
          >
            <ArrowLeft className="h-4 w-4" />
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
          <Button variant="outline" size="sm" className="text-[12px]" href="/admin/products">
            Cancel
          </Button>
          <Button type="submit" form="product-form" size="sm" variant="dark" className="text-[12px]" loading={saveMutation.loading}>
            {!saveMutation.loading && <Check className="h-4 w-4" />}
            {saveLabel}
          </Button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-3 rounded-md border border-warm-200 bg-white p-4">
          <h2 className="flex items-center gap-1.5 border-b border-warm-100 pb-2 text-[13px] font-bold text-warm-900">
            <Package className="h-3.5 w-3.5 text-brand-600" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product Name" htmlFor="name" required error={errors.name?.message}>
              <Input
                id="name"
                className={COMPACT}
                placeholder="e.g. Minimalist Leather Watch"
                error={errors.name?.message}
                {...register('name')}
              />
            </Field>

            <Field label="URL Slug" htmlFor="slug" required error={errors.slug?.message}>
              <Input
                id="slug"
                className={`${COMPACT} font-mono`}
                placeholder="minimalist-leather-watch"
                error={errors.slug?.message}
                {...register('slug')}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <textarea
              id="description"
              rows={4}
              placeholder="Detailed description of materials, sizing, features..."
              className="w-full resize-none rounded-md border border-warm-300 bg-white px-3.5 py-2 text-[11px] text-warm-900 placeholder:text-warm-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              {...register('description')}
            />
          </Field>

          <Field
            label="Product Link (Admin reference / supplier link, never shown to customers)"
            htmlFor="productLink"
            error={errors.productLink?.message}
          >
            <Input
              id="productLink"
              type="url"
              className={`${COMPACT} font-mono`}
              placeholder="https://supplier.com/product-source-link"
              error={errors.productLink?.message}
              {...register('productLink')}
            />
          </Field>
        </div>

        {/* Pricing, Category & Inventory */}
        <div className="space-y-3 rounded-md border border-warm-200 bg-white p-4">
          <h2 className="border-b border-warm-100 pb-2 text-[13px] font-bold text-warm-900">
            Pricing, Category & Inventory
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Regular Price (₹)" htmlFor="price" required error={errors.price?.message}>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={0}
                className={COMPACT}
                placeholder="99.99"
                error={errors.price?.message}
                {...register('price')}
              />
            </Field>

            <Field label="Sale Price (₹)" htmlFor="discountPrice" error={errors.discountPrice?.message}>
              <Input
                id="discountPrice"
                type="number"
                step="0.01"
                min={0}
                className={COMPACT}
                placeholder="79.99"
                error={errors.discountPrice?.message}
                {...register('discountPrice')}
              />
            </Field>

            <Field label="Available Stock" htmlFor="stock" required error={errors.stock?.message}>
              <Input
                id="stock"
                type="number"
                min={0}
                className={COMPACT}
                error={errors.stock?.message}
                {...register('stock')}
              />
            </Field>
          </div>

          <Field label="Categories" error={errors.categoryIds?.message}>
            <Controller
              name="categoryIds"
              control={control}
              render={({ field }) => (
                <CategoryTreeSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select categories..."
                />
              )}
            />
          </Field>

          <div className="flex flex-wrap gap-4 pt-1.5">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" className="h-3.5 w-3.5 rounded accent-warm-900" {...register('isActive')} />
              <span className="text-[11px] font-medium text-warm-800">Active (visible on storefront)</span>
            </label>

            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" className="h-3.5 w-3.5 rounded accent-warm-900" {...register('codAvailable')} />
              <span className="text-[11px] font-medium text-warm-800">Cash on Delivery Available</span>
            </label>
          </div>
        </div>

        {/* Product Images */}
        <div className="space-y-3 rounded-md border border-warm-200 bg-white p-4">
          <h2 className="border-b border-warm-100 pb-2 text-[13px] font-bold text-warm-900">Product Images</h2>
          <Controller
            name="images"
            control={control}
            render={({ field }) => (
              <ImageUpload
                uploadType="product-image"
                value={field.value || []}
                onChange={field.onChange}
                multiple
                maxFiles={8}
                label="Upload Product Photos"
              />
            )}
          />
          {errors.images && <p className="mt-1 text-xs text-red-600">{errors.images.message}</p>}
        </div>

        {/* Specifications */}
        <div className="space-y-3 rounded-md border border-warm-200 bg-white p-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2">
            <div>
              <h2 className="text-[13px] font-bold text-warm-900">Technical Specifications</h2>
              <p className="text-[10px] text-warm-500">Custom key-value pairs (e.g. Material: Organic Cotton)</p>
            </div>
            <button
              type="button"
              onClick={() => append({ label: '', value: '' })}
              className="inline-flex items-center gap-1 rounded-md bg-warm-100 px-2.5 py-1 text-[11px] font-semibold text-warm-900 transition-colors hover:bg-warm-200"
            >
              <Plus className="h-3 w-3" />
              <span>Add Spec Row</span>
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-md border-2 border-dashed border-warm-100 py-4 text-center text-[11px] text-warm-400">
              No specifications added yet. Click &quot;Add Spec Row&quot; to add details like Material, Weight,
              Dimensions, etc.
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      className={COMPACT}
                      placeholder="Label (e.g. Material)"
                      aria-label={`Specification ${index + 1} label`}
                      {...register(`specifications.${index}.label`)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      className={COMPACT}
                      placeholder="Value (e.g. 100% Cotton)"
                      aria-label={`Specification ${index + 1} value`}
                      {...register(`specifications.${index}.value`)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded-md p-1.5 text-warm-400 transition-colors hover:text-red-600"
                    title="Remove specification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex justify-end gap-2 pt-1.5">
          <Button variant="outline" size="sm" className="text-[12px]" href="/admin/products">
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="dark" className="text-[12px]" loading={saveMutation.loading}>
            {!saveMutation.loading && <Check className="h-4 w-4" />}
            {saveLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
