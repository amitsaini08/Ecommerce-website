'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';
import { Settings, Check, Mail, Phone } from 'lucide-react';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

import { settingsApi } from '@/lib/apiClient/settings';
import { useMutation } from '@/hooks/useMutation';

const COMPACT = 'h-8 text-[11px]';

const DEFAULTS = {
  storeName: 'NovaHub',
  contactEmail: '',
  contactPhone: '',
  codEnabled: true,
  shippingFee: '0',
  minFreeShipping: '50',
};

function validate(form) {
  const errors = {};
  if (!form.storeName.trim()) errors.storeName = 'Store name is required';
  if (form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
    errors.contactEmail = 'Enter a valid email address';
  }
  if (form.shippingFee === '' || Number(form.shippingFee) < 0) {
    errors.shippingFee = 'Shipping fee cannot be negative';
  }
  if (form.minFreeShipping === '' || Number(form.minFreeShipping) < 0) {
    errors.minFreeShipping = 'Minimum order cannot be negative';
  }
  return errors;
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});

  const saveMutation = useMutation((payload) => settingsApi.update(payload));

  // one handler for every field
  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function fetchSettings() {
    try {
      const data = await settingsApi.get();
      if (data?.settings) {
        const s = data.settings;
        setForm({
          storeName: s.storeName || DEFAULTS.storeName,
          contactEmail: s.contactEmail || '',
          contactPhone: s.contactPhone || '',
          codEnabled: s.codEnabled ?? true,
          shippingFee: String(s.shippingFee ?? '0'),
          minFreeShipping: String(s.minFreeShipping ?? '50'),
        });
      }
    } catch {
      toast.error('Failed to load settings');
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => fetchSettings());
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const res = await saveMutation.run({
      ...form,
      storeName: form.storeName.trim(),
      shippingFee: parseFloat(form.shippingFee) || 0,
      minFreeShipping: parseFloat(form.minFreeShipping) || 0,
    });
    if (res) toast.success('Store settings saved successfully!');
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-brand-600/30 border-t-brand-600" />
        <p className="text-[11px] text-warm-500">Loading store settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Store Settings</h1>
          <p className="text-[11px] text-warm-500">
            Configure global storefront preferences & checkout defaults
          </p>
        </div>
        <Button type="submit" form="settings-form" size="sm" variant="dark" className="text-[12px]" loading={saveMutation.loading}>
          {!saveMutation.loading && <Check className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* General & Contact */}
        <div className="space-y-3 rounded-md border border-warm-200 bg-white p-4 shadow-xs">
          <h2 className="flex items-center gap-1.5 border-b border-warm-100 pb-2 text-[13px] font-bold text-warm-900">
            <Settings className="h-3.5 w-3.5 text-brand-600" />
            General & Contact Information
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Store Name" htmlFor="storeName" required error={errors.storeName}>
              <Input
                id="storeName"
                className={COMPACT}
                value={form.storeName}
                onChange={set('storeName')}
                error={errors.storeName}
              />
            </Field>

            <Field label="Customer Support Email" htmlFor="contactEmail" error={errors.contactEmail}>
              <Input
                id="contactEmail"
                type="email"
                icon={Mail}
                className={COMPACT}
                placeholder="support@novahub.com"
                value={form.contactEmail}
                onChange={set('contactEmail')}
                error={errors.contactEmail}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Customer Support Phone" htmlFor="contactPhone">
                <Input
                  id="contactPhone"
                  type="tel"
                  icon={Phone}
                  className={COMPACT}
                  placeholder="+91 98765 43210"
                  value={form.contactPhone}
                  onChange={set('contactPhone')}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Payment & Shipping */}
        <div className="space-y-3 rounded-md border border-warm-200 bg-white p-4 shadow-xs">
          <h2 className="border-b border-warm-100 pb-2 text-[13px] font-bold text-warm-900">
            Payment & Shipping Rules
          </h2>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-warm-200 p-2.5 transition-colors hover:bg-warm-50/50">
            <input
              type="checkbox"
              checked={form.codEnabled}
              onChange={set('codEnabled')}
              className="h-3.5 w-3.5 rounded accent-warm-900"
            />
            <div>
              <p className="text-[11px] font-bold text-warm-900">Enable Cash on Delivery (COD)</p>
              <p className="text-[10px] text-warm-500">Allow shoppers to pay in cash upon package arrival</p>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Flat Rate Shipping Fee (₹)" htmlFor="shippingFee" error={errors.shippingFee}>
              <Input
                id="shippingFee"
                type="number"
                step="0.01"
                min={0}
                className={COMPACT}
                value={form.shippingFee}
                onChange={set('shippingFee')}
                error={errors.shippingFee}
              />
            </Field>

            <Field
              label="Minimum Order for Free Shipping (₹)"
              htmlFor="minFreeShipping"
              error={errors.minFreeShipping}
            >
              <Input
                id="minFreeShipping"
                type="number"
                step="0.01"
                min={0}
                className={COMPACT}
                value={form.minFreeShipping}
                onChange={set('minFreeShipping')}
                error={errors.minFreeShipping}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1.5">
          <Button type="submit" size="sm" variant="dark" className="text-[12px]" loading={saveMutation.loading}>
            {!saveMutation.loading && <Check className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}