'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import CustomSelect from '@/components/ui/CustomSelect';
import Button from '@/components/ui/Button';

const TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentage Discount (%)' },
  { value: 'flat', label: 'Flat Amount Discount (₹)' },
];

const EMPTY_FORM = {
  code: '',
  type: 'percent',
  value: '',
  minOrderAmount: '',
  expiresAt: '',
  isActive: true,
};

function CouponFormBody({ coupon, saving, onSubmit, onCancel }) {
  const [form, setForm] = useState(() =>
    coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderAmount: coupon.minOrderAmount || '',
          expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : '',
          isActive: coupon.isActive,
        }
      : EMPTY_FORM
  );

 const update = (field) => (e) => {
  const value = e.target.value;
  setForm((prev) => ({
    ...prev,
    [field]:
      field === 'value' || field === 'minOrderAmount'
        ? value === ''
          ? ''
          : Number(value)
        : value,
  }));
};

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting form:', form);
    onSubmit(form);
  };

  const isPercent = form.type === 'percent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Coupon Code" htmlFor="coupon-code" required>
          <Input
            id="coupon-code"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="e.g. SUMMER20"
            className="font-mono uppercase"
          />
        </Field>

        <Field label="Discount Type">
          <CustomSelect
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(val) => setForm((prev) => ({ ...prev, type: val }))}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Discount Value (${isPercent ? '%' : '₹'})`} htmlFor="coupon-value" required>
          <Input
            id="coupon-value"
            type="number"
            step="0.01"
            value={form.value}
            onChange={update('value')}
            placeholder={isPercent ? '20' : '150'}
          />
        </Field>

        <Field label="Min Order Amount (₹)" htmlFor="coupon-min">
          <Input
            id="coupon-min"
            type="number"
            step="0.01"
            value={form.minOrderAmount}
            onChange={update('minOrderAmount')}
            placeholder="0"
          />
        </Field>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <Field label="Expiration Date" htmlFor="coupon-expiry">
          <Input
            id="coupon-expiry"
            type="date"
            value={form.expiresAt}
            onChange={update('expiresAt')}
          />
        </Field>

        <label
          htmlFor="coupon-active"
          className="flex h-10 cursor-pointer items-center gap-2 text-sm font-medium text-warm-800"
        >
          <input
            type="checkbox"
            id="coupon-active"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 rounded accent-warm-900"
          />
          Active (usable by customers)
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-warm-100 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="dark" loading={saving}>
          {!saving && <Check className="h-4 w-4" />}
          {coupon ? 'Update coupon' : 'Save coupon'}
        </Button>
      </div>
    </form>
  );
}

export default function CouponCreateEditForm({ isOpen, onClose, coupon, saving, onSubmit }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={coupon ? 'Edit Coupon' : 'Create New Coupon'}
    >
      <CouponFormBody coupon={coupon} saving={saving} onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  );
}