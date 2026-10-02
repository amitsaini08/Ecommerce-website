'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/common/ImageUpload';
import Modal from '../common/Modal';

const PRESET_COLORS = [
    { label: 'Dark Neutral', value: '#18181b' },
    { label: 'Slate Dark', value: '#0f172a' },
    { label: 'Indigo Deep', value: '#1e1b4b' },
    { label: 'Emerald Dark', value: '#064e3b' },
    { label: 'Rose Wine', value: '#4c0519' },
    { label: 'Warm Bronze', value: '#451a03' },
];


export default function BannerCreateEditForm({ isOpen, onClose, banner, nextSortOrder = 0, saving = false, onSubmit, onCancel }) {
    const [form, setForm] = useState(() =>
        banner
            ? {
                title: banner.title || '',
                subtitle: banner.subtitle || '',
                imageUrl: banner.imageUrl || '',
                bgColor: banner.bgColor || '#18181b',
                linkUrl: banner.linkUrl || '',
                isActive: banner.isActive ?? true,
                sortOrder: banner.sortOrder ?? 0,
            }
            : {
                title: '',
                subtitle: '',
                imageUrl: '',
                bgColor: '#18181b',
                linkUrl: '/products',
                isActive: true,
                sortOrder: nextSortOrder,
            }
    );

    const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={banner ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Banner Title" htmlFor="banner-title" required>
                    <Input
                        id="banner-title"
                        value={form.title}
                        onChange={update('title')}
                        placeholder="e.g. Summer Fashion Sale — Up to 40% Off"
                        required
                    />
                </Field>

                <Field label="Subtitle / Tagline" htmlFor="banner-subtitle">
                    <Input
                        id="banner-subtitle"
                        value={form.subtitle}
                        onChange={update('subtitle')}
                        placeholder="e.g. Discover exclusive deals on apparel and accessories"
                    />
                </Field>

                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-warm-700">Banner Background Color</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                title={c.label}
                                aria-label={c.label}
                                onClick={() => setForm((prev) => ({ ...prev, bgColor: c.value }))}
                                className={`h-7 w-7 rounded-full border-2 transition-all ${form.bgColor === c.value
                                    ? 'scale-110 border-warm-900 shadow-xs'
                                    : 'border-transparent opacity-80 hover:opacity-100'
                                    }`}
                                style={{ backgroundColor: c.value }}
                            />
                        ))}
                        <input
                            type="color"
                            aria-label="Custom background color"
                            value={form.bgColor}
                            onChange={update('bgColor')}
                            className="h-8 w-8 cursor-pointer rounded-lg border border-warm-200 p-0"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-warm-700">Banner Image (Optional)</p>
                    <ImageUpload
                        images={form.imageUrl ? [form.imageUrl] : []}
                        onChange={(urls) => setForm((prev) => ({ ...prev, imageUrl: urls[0] || '' }))}
                        type="product-image"
                        maxFiles={1}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Link URL" htmlFor="banner-link">
                        <Input
                            id="banner-link"
                            value={form.linkUrl}
                            onChange={update('linkUrl')}
                            placeholder="/products?sort=best-sellers"
                        />
                    </Field>

                    <Field label="Sort Order" htmlFor="banner-sort">
                        <Input
                            id="banner-sort"
                            type="number"
                            value={form.sortOrder}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value || '0') }))
                            }
                        />
                    </Field>
                </div>

                <label htmlFor="banner-active" className="flex cursor-pointer items-center gap-2 text-xs font-medium text-warm-900">
                    <input
                        type="checkbox"
                        id="banner-active"
                        checked={form.isActive}
                        onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 rounded accent-warm-900"
                    />
                    Active on storefront homepage
                </label>

                <div className="flex justify-end gap-2 border-t border-warm-100 pt-4">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="dark"  loading={saving}>
                        {banner ? 'Update banner' : 'Create banner'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}