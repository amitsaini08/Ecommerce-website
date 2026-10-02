'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser, selectAuthLoading, setUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/common/Toast';
import { profileApi } from '@/lib/apiClient/profile';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ImageUpload from '@/components/common/ImageUpload';
import AddressForm from '@/components/address/AddressForm';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { FiUser, FiMapPin, FiMail, FiPhone, FiSave, FiPlus, FiLock, FiCheck, FiX } from 'react-icons/fi';
import { handleNumericKeyDown, checkPasswordRules } from '@/lib/inputHelpers';

const COMPACT = 'h-8 text-[11px]';

const TABS = [
  { id: 'profile', label: 'Personal Profile', icon: FiUser },
  { id: 'security', label: 'Security & Password', icon: FiLock },
  { id: 'addresses', label: 'Saved Addresses', icon: FiMapPin },
];

// API errors arrive as err.data = { error, field?, errors?: [{ field, message }] }
const fieldErrorsFrom = (err) => {
  const raw = err.errors ?? err.data?.errors;

  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((e) => [e.field, e.message]));
  }
  if (raw && typeof raw === 'object' && Object.keys(raw).length) {
    return raw;
  }

  const field = err.field ?? err.data?.field;
  if (field) return { [field]: err.message };

  return null;
};
/* ───────────────────────── Profile tab ───────────────────────── */
function ProfileTab({ initial }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [blocked, setBlocked] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = form.name.trim().length >= 2 && (!form.phone || form.phone.length === 10);

  function onName(e) {
    const v = e.target.value;
    setForm((f) => ({ ...f, name: v }));
    setErrors((er) => ({
      ...er,
      name: !v.trim() ? 'Name is required' : v.trim().length < 2 ? 'Name must be at least 2 characters' : '',
    }));
  }

  function onPhone(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, phone: v }));
    setErrors((er) => ({ ...er, phone: v && v.length !== 10 ? 'Phone number must be exactly 10 digits' : '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    try {
      const data = await profileApi.update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl,
      });
      toast.success('Profile updated!');
      dispatch(setUser(data.user));
    } catch (err) {
      const map = fieldErrorsFrom(err);
      if (map) setErrors(map);
      else toast.error(err.message || 'Failed to update profile');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-lg rounded-md border border-warm-200 bg-white p-4 shadow-xs sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="border-b border-warm-100 pb-3.5">
          <div className="mb-2.5 flex items-center gap-3">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="Profile avatar" className="h-12 w-12 shrink-0 rounded-full border-2 border-warm-200 object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-warm-200 bg-warm-900 text-[15px] font-bold text-white">
                {form.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold text-warm-900">Profile picture</p>
              <p className="text-[10px] text-warm-500">JPG, PNG or WEBP</p>
            </div>
          </div>

          {/* ImageUpload props are: value, onChange, multiple, maxFiles, uploadType */}
          <ImageUpload
            uploadType="avatar"
            multiple={false}
            maxFiles={1}
            label=""
            value={form.avatarUrl}
            onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url || '' }))}
          />
        </div>

        <Field label="Full Name" htmlFor="name" required error={errors.name}>
          <Input id="name" icon={FiUser} className={COMPACT} value={form.name} onChange={onName} error={errors.name} />
        </Field>

        <Field label="Email Address (read only)" htmlFor="email">
          <Input id="email" type="email" icon={FiMail} className={`${COMPACT} cursor-not-allowed bg-warm-50 text-warm-500`} value={form.email} readOnly />
        </Field>

        <Field label="Phone Number" htmlFor="phone" error={errors.phone}>
          <Input
            id="phone"
            icon={FiPhone}
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile number"
            className={COMPACT}
            value={form.phone}
            onKeyDown={(e) =>
              handleNumericKeyDown(e, (msg) => {
                setBlocked(msg);
                setTimeout(() => setBlocked(''), 2000);
              })
            }
            onChange={onPhone}
            error={errors.phone}
          />
          {blocked && <p className="mt-0.5 text-[10px] text-amber-600">{blocked}</p>}
        </Field>

        <Button type="submit" size="sm" variant="dark" loading={saving} disabled={!isValid}>
          {!saving && <FiSave className="h-3.5 w-3.5" />} Save Changes
        </Button>
      </form>
    </div>
  );
}

/* ───────────────────────── Security tab ───────────────────────── */
function SecurityTab() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const check = checkPasswordRules(form.newPassword, form.currentPassword);
  const mismatch = form.confirmPassword && form.newPassword && form.confirmPassword !== form.newPassword;
  const isValid =
    form.currentPassword && check.allPassed && form.confirmPassword && form.confirmPassword === form.newPassword;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setErrors({});
    try {
      const data = await profileApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(data?.message || 'Password updated successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const map = fieldErrorsFrom(err);

      if (map) {
        setErrors(map);
      } else if (err.status >= 400 && err.status < 500) {
        setErrors({ currentPassword: err.message });
      } else {
        toast.error(err.message || 'Failed to change password');
      }
    }
    setSaving(false);
  }

  return (
    <div className="max-w-lg rounded-md border border-warm-200 bg-white p-4 shadow-xs sm:p-5">
      <h2 className="mb-1 text-[13px] font-bold text-warm-900">Change Password</h2>
      <p className="mb-4 text-[11px] text-warm-500">Ensure your account is using a strong, unique password.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input type="password" already includes the show/hide toggle */}
        <Field label="Current Password" htmlFor="currentPassword" required error={errors.currentPassword}>
          <Input id="currentPassword" type="password" icon={FiLock} className={COMPACT}
            placeholder="Enter current password" value={form.currentPassword}
            onChange={set('currentPassword')} error={errors.currentPassword} />
        </Field>

        <Field label="New Password" htmlFor="newPassword" required error={errors.newPassword}>
          <Input id="newPassword" type="password" icon={FiLock} className={COMPACT}
            placeholder="Enter new password" value={form.newPassword}
            onChange={set('newPassword')} error={errors.newPassword} />

          {form.newPassword && (
            <div className="mt-2.5 space-y-1 rounded-md border border-warm-100 bg-warm-50 p-2.5">
              <p className="mb-1 text-[10px] font-bold text-warm-700">Password requirements:</p>
              {check.rules.map((rule) => (
                <div key={rule.key} className="flex items-center gap-1.5 text-[10px]">
                  {rule.passed
                    ? <FiCheck className="h-3 w-3 shrink-0 text-emerald-600" />
                    : <FiX className="h-3 w-3 shrink-0 text-red-500" />}
                  <span className={rule.passed ? 'font-medium text-emerald-700' : 'text-warm-600'}>{rule.label}</span>
                </div>
              ))}
            </div>
          )}
        </Field>

        <Field
          label="Confirm New Password"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword || (mismatch ? 'Passwords do not match' : '')}
        >
          <Input id="confirmPassword" type="password" icon={FiLock} className={COMPACT}
            placeholder="Re-enter new password" value={form.confirmPassword}
            onChange={set('confirmPassword')} error={errors.confirmPassword || mismatch} />
        </Field>

        <Button type="submit" variant="dark" size="sm" className="w-full" loading={saving} disabled={!isValid}>
          Update Password
        </Button>
      </form>
    </div>
  );
}

/* ───────────────────────── Addresses tab ───────────────────────── */
function AddressesTab({ addresses, onChanged }) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // returns null on success, or a { field: message } map for AddressForm to show
  async function handleAdd(payload) {
    setSaving(true);
    try {
      await profileApi.addAddress(payload);
      toast.success('Address added!');
      setShowForm(false);
      onChanged();
      return null;
    } catch (err) {
      const map = fieldErrorsFrom(err);
      if (map) return map;
      toast.error(err.message || 'Failed to add address');
      return null;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-warm-900">Delivery Addresses</h2>
        <Button size="sm" variant="dark" onClick={() => setShowForm((s) => !s)}>
          <FiPlus className="h-3.5 w-3.5" /> Add New Address
        </Button>
      </div>

      {showForm && <AddressForm saving={saving} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.length === 0 ? (
          <p className="col-span-2 rounded-md border border-warm-200 bg-white py-6 text-center text-[11px] text-warm-400 shadow-xs">
            No saved addresses yet.
          </p>
        ) : (
          addresses.map((a) => (
            <div key={a._id || a.id} className="space-y-1 rounded-md border border-warm-200 bg-white p-3.5 text-[11px] shadow-xs">
              {a.label && <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-900">{a.label}</span>}
              <p className="font-semibold text-warm-900">{a.line1}</p>
              {a.line2 && <p className="text-warm-600">{a.line2}</p>}
              <p className="text-warm-600">{a.city}, {a.state} — {a.pincode}</p>
              {a.phone && <p className="mt-1.5 text-[10px] text-warm-400">Phone: {a.phone}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const authUser = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = authUser?._id;

  async function fetchProfile() {
    try {
      const data = await profileApi.get();
      if (data?.user) {
        setProfile({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatarUrl: data.user.avatarUrl || '',
        });
        setAddresses(data.addresses || []);
      }
    } catch { }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [userId, authLoading]); // userId, not authUser, so saving the profile doesn't refetch

  if (loading || authLoading || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-warm-900/20 border-t-warm-900" />
        <p className="text-[12px] font-medium text-warm-500">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My Account' }]} />
      <h1 className="mb-5 text-lg font-bold tracking-tight text-warm-900">My Account</h1>

      <div className="mb-5 flex overflow-x-auto border-b border-warm-200" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2 text-[12px] font-semibold transition-colors ${activeTab === id ? 'border-warm-900 text-warm-900' : 'border-transparent text-warm-500 hover:text-warm-700'
              }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}{id === 'addresses' && ` (${addresses.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab initial={profile} />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'addresses' && <AddressesTab addresses={addresses} onChanged={fetchProfile} />}
    </div>
  );
}