'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { handleNumericKeyDown, validatePhoneFormat, validatePincodeFormat } from '@/lib/inputHelpers';

const COMPACT = 'h-8 text-[11px]';
const EMPTY = { label: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' };

const VALIDATORS = {
  line1: (v) => (v.trim() ? '' : 'Address line 1 is required'),
  city: (v) => (v.trim() ? '' : 'City is required'),
  state: (v) => (v.trim() ? '' : 'State is required'),
  pincode: (v) => validatePincodeFormat(v),
  phone: (v) => (v ? validatePhoneFormat(v) : ''),
};

export default function AddressForm({ onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [blocked, setBlocked] = useState({});

  function change(field, raw) {
    let v = raw;
    if (field === 'pincode') v = raw.replace(/\D/g, '').slice(0, 6);
    if (field === 'phone') v = raw.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, [field]: v }));
    if (VALIDATORS[field]) setErrors((e) => ({ ...e, [field]: VALIDATORS[field](v) }));
  }

  const onNumericKey = (field) => (e) =>
    handleNumericKeyDown(e, (msg) => {
      setBlocked((b) => ({ ...b, [field]: msg }));
      setTimeout(() => setBlocked((b) => ({ ...b, [field]: '' })), 2000);
    });

  const isValid =
    form.line1.trim() && form.city.trim() && form.state.trim() &&
    form.pincode.length === 6 && (!form.phone || form.phone.length === 10);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
    const serverErrors = await onSubmit(payload); // null on success, field map on failure
    if (serverErrors) setErrors(serverErrors);
  }

  const field = (name) => ({
    value: form[name],
    onChange: (e) => change(name, e.target.value),
    error: errors[name],
    className: COMPACT,
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 grid grid-cols-2 gap-2.5 rounded-md border border-warm-200 bg-warm-50/70 p-3.5"
    >
      <div className="col-span-2">
        <Field label="Label" htmlFor="addr-label">
          <Input id="addr-label" placeholder="Home, Office" {...field('label')} />
        </Field>
      </div>

      <div className="col-span-2">
        <Field label="Address Line 1" htmlFor="addr-line1" required error={errors.line1}>
          <Input id="addr-line1" {...field('line1')} />
        </Field>
      </div>

      <div className="col-span-2">
        <Field label="Address Line 2" htmlFor="addr-line2">
          <Input id="addr-line2" {...field('line2')} />
        </Field>
      </div>

      <Field label="City" htmlFor="addr-city" required error={errors.city}>
        <Input id="addr-city" {...field('city')} />
      </Field>

      <Field label="State" htmlFor="addr-state" required error={errors.state}>
        <Input id="addr-state" {...field('state')} />
      </Field>

      <Field label="Pincode" htmlFor="addr-pincode" required error={errors.pincode}>
        <Input
          id="addr-pincode"
          inputMode="numeric"
          maxLength={6}
          placeholder="6 digits"
          onKeyDown={onNumericKey('pincode')}
          {...field('pincode')}
        />
        {blocked.pincode && <p className="mt-0.5 text-[10px] text-amber-600">{blocked.pincode}</p>}
      </Field>

      <Field label="Phone" htmlFor="addr-phone" error={errors.phone}>
        <Input
          id="addr-phone"
          inputMode="numeric"
          maxLength={10}
          placeholder="10 digits"
          onKeyDown={onNumericKey('phone')}
          {...field('phone')}
        />
        {blocked.phone && <p className="mt-0.5 text-[10px] text-amber-600">{blocked.phone}</p>}
      </Field>

      <div className="col-span-2 flex gap-2 pt-1">
        <Button type="submit" size="sm" variant="dark" loading={saving} disabled={!isValid}>
          Save Address
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}