'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser, selectAuthLoading, setUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ImageUpload from '@/components/ui/ImageUpload';
import { FiUser, FiMapPin, FiMail, FiPhone, FiSave, FiPlus, FiLock, FiCheck, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import {
  handleNumericKeyDown,
  handleAlphaKeyDown,
  checkPasswordRules,
  validatePhoneFormat,
  validatePincodeFormat,
} from '@/lib/inputHelpers';

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const authUser = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', avatarUrl: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileBlockedMsg, setProfileBlockedMsg] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Address form state
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
  const [addrErrors, setAddrErrors] = useState({});
  const [addrBlockedMsg, setAddrBlockedMsg] = useState({});
  const [addrSaving, setAddrSaving] = useState(false);

  // Change password form state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwFieldErrors, setPwFieldErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [authUser, authLoading]);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatarUrl: data.user.avatarUrl || '',
        });
        setAddresses(data.addresses || []);
      }
    } catch {}
    setLoading(false);
  }

  // Temporary blocked key notice helper
  const showBlockedWarning = (setter, field, msg) => {
    setter((prev) => ({ ...prev, [field]: msg }));
    setTimeout(() => {
      setter((prev) => ({ ...prev, [field]: '' }));
    }, 2000);
  };

  // --- Profile Validation ---
  const handleProfileNameChange = (e) => {
    const val = e.target.value;
    setProfileData((prev) => ({ ...prev, name: val }));
    if (!val.trim()) {
      setProfileErrors((prev) => ({ ...prev, name: 'Name is required' }));
    } else if (val.trim().length < 2) {
      setProfileErrors((prev) => ({ ...prev, name: 'Name must be at least 2 characters' }));
    } else {
      setProfileErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleProfilePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setProfileData((prev) => ({ ...prev, phone: val }));
    if (val && val.length !== 10) {
      setProfileErrors((prev) => ({ ...prev, phone: 'Phone number must be exactly 10 digits' }));
    } else {
      setProfileErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const isProfileValid = profileData.name.trim().length >= 2 && (!profileData.phone || profileData.phone.length === 10);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!isProfileValid) return;

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name.trim(),
          phone: profileData.phone.trim(),
          avatarUrl: profileData.avatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated!');
        dispatch(setUser(data.user));
      } else {
        if (data.errors) {
          const map = {};
          data.errors.forEach((err) => { map[err.field] = err.message; });
          setProfileErrors(map);
        } else {
          toast.error(data.error || 'Failed to update profile');
        }
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setSaving(false);
  }

  // --- Address Validation ---
  const handleAddrFieldChange = (field, value) => {
    let cleanVal = value;
    if (field === 'pincode') cleanVal = value.replace(/\D/g, '').slice(0, 6);
    if (field === 'phone') cleanVal = value.replace(/\D/g, '').slice(0, 10);

    setAddrForm((prev) => ({ ...prev, [field]: cleanVal }));

    const newErrs = { ...addrErrors };
    if (field === 'line1') newErrs.line1 = cleanVal.trim() ? '' : 'Address line 1 is required';
    if (field === 'city') newErrs.city = cleanVal.trim() ? '' : 'City is required';
    if (field === 'state') newErrs.state = cleanVal.trim() ? '' : 'State is required';
    if (field === 'pincode') newErrs.pincode = validatePincodeFormat(cleanVal);
    if (field === 'phone') newErrs.phone = cleanVal ? validatePhoneFormat(cleanVal) : '';

    setAddrErrors(newErrs);
  };

  const isAddrValid =
    addrForm.line1.trim() &&
    addrForm.city.trim() &&
    addrForm.state.trim() &&
    addrForm.pincode.length === 6 &&
    (!addrForm.phone || addrForm.phone.length === 10);

  async function handleAddAddress(e) {
    e.preventDefault();
    if (!isAddrValid) return;

    setAddrSaving(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: addrForm.label.trim(),
          line1: addrForm.line1.trim(),
          line2: addrForm.line2.trim(),
          city: addrForm.city.trim(),
          state: addrForm.state.trim(),
          pincode: addrForm.pincode.trim(),
          phone: addrForm.phone.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Address added!');
        setAddrForm({ label: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
        setAddrErrors({});
        setShowAddAddr(false);
        fetchProfile();
      } else {
        if (data.errors) {
          const map = {};
          data.errors.forEach((err) => { map[err.field] = err.message; });
          setAddrErrors(map);
        } else {
          toast.error(data.error || 'Failed to add address');
        }
      }
    } catch {
      toast.error('Failed to add address');
    }
    setAddrSaving(false);
  }

  // --- Password Rules & Change Password ---
  const pwCheck = checkPasswordRules(pwForm.newPassword, pwForm.currentPassword);

  const confirmMatch =
    !pwForm.confirmPassword || !pwForm.newPassword || pwForm.confirmPassword === pwForm.newPassword;

  const isPasswordFormValid =
    pwForm.currentPassword.length > 0 &&
    pwCheck.allPassed &&
    pwForm.confirmPassword.length > 0 &&
    pwForm.confirmPassword === pwForm.newPassword;

  const handleCurrentPwChange = (e) => {
    const val = e.target.value;
    setPwForm((prev) => ({ ...prev, currentPassword: val }));
    setPwFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
  };

  const handleNewPwChange = (e) => {
    const val = e.target.value;
    setPwForm((prev) => ({ ...prev, newPassword: val }));
    setPwFieldErrors((prev) => ({ ...prev, newPassword: '' }));
  };

  const handleConfirmPwChange = (e) => {
    const val = e.target.value;
    setPwForm((prev) => ({ ...prev, confirmPassword: val }));
    if (val && pwForm.newPassword && val !== pwForm.newPassword) {
      setPwFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setPwFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    if (!isPasswordFormValid) return;

    setPwSaving(true);
    setPwFieldErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Password updated successfully!');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        if (data.field) {
          setPwFieldErrors((prev) => ({ ...prev, [data.field]: data.message }));
        } else if (data.errors && data.errors.length > 0) {
          const map = {};
          data.errors.forEach((err) => { map[err.field] = err.message; });
          setPwFieldErrors((prev) => ({ ...prev, ...map }));
        } else {
          toast.error(data.error || 'Failed to change password');
        }
      }
    } catch {
      toast.error('Network error. Failed to change password.');
    }
    setPwSaving(false);
  }

  if (loading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="w-6 h-6 border-2 border-warm-900/20 border-t-warm-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-warm-500 text-[12px] font-medium">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My Account' }]} />

      <h1 className="text-lg font-bold text-warm-900 tracking-tight mb-5">My Account</h1>

      {/* Tabs */}
      <div className="flex border-b border-warm-200 mb-5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 pb-2 px-3 font-semibold text-[12px] border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-warm-900 text-warm-900'
              : 'border-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          <FiUser className="w-3.5 h-3.5" /> Personal Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 pb-2 px-3 font-semibold text-[12px] border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-warm-900 text-warm-900'
              : 'border-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          <FiLock className="w-3.5 h-3.5" /> Security & Password
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-1.5 pb-2 px-3 font-semibold text-[12px] border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'addresses'
              ? 'border-warm-900 text-warm-900'
              : 'border-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          <FiMapPin className="w-3.5 h-3.5" /> Saved Addresses ({addresses.length})
        </button>
      </div>

      {/* Tab 1: Profile Form */}
      {activeTab === 'profile' && (
        <div className="bg-white p-4 sm:p-5 rounded-md border border-warm-200 shadow-xs max-w-lg">
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            {/* Avatar Uploader */}
            <div className="border-b border-warm-100 pb-3.5">
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1.5">
                Profile Picture
              </label>
              <div className="flex items-center gap-3 mb-2.5">
                {profileData.avatarUrl ? (
                  <img
                    src={profileData.avatarUrl}
                    alt="Profile Avatar"
                    className="w-12 h-12 rounded-full object-cover border-2 border-warm-200 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warm-900 text-white font-bold text-[15px] flex items-center justify-center border-2 border-warm-200 shrink-0">
                    {profileData.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-warm-900">Upload new avatar</p>
                  <p className="text-[10px] text-warm-500">Supports JPG, PNG or WEBP up to 10MB</p>
                </div>
              </div>
              <ImageUpload
                images={profileData.avatarUrl ? [profileData.avatarUrl] : []}
                onChange={(urls) => setProfileData({ ...profileData, avatarUrl: urls[0] || '' })}
                type="review-media"
                maxFiles={1}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={profileData.name}
                  onChange={handleProfileNameChange}
                  className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
              </div>
              {profileErrors.name && <p className="text-red-600 text-[10px] mt-1">{profileErrors.name}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Email Address (ReadOnly)
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="email"
                  value={profileData.email}
                  readOnly
                  className="w-full pl-8 pr-3 py-1.5 bg-warm-50 border border-warm-200 rounded-md text-[11px] text-warm-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={profileData.phone}
                  onKeyDown={(e) => handleNumericKeyDown(e, (msg) => showBlockedWarning(setProfileBlockedMsg, 'phone', msg))}
                  onChange={handleProfilePhoneChange}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                />
              </div>
              {profileBlockedMsg.phone && (
                <p className="text-amber-600 text-[10px] mt-0.5 animate-fade-in">{profileBlockedMsg.phone}</p>
              )}
              {profileErrors.phone && <p className="text-red-600 text-[10px] mt-0.5">{profileErrors.phone}</p>}
            </div>

            <button
              type="submit"
              disabled={saving || !isProfileValid}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-warm-900 text-white font-semibold text-[11px] rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50"
            >
              <FiSave className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Change Password */}
      {activeTab === 'security' && (
        <div className="bg-white p-4 sm:p-5 rounded-md border border-warm-200 shadow-xs max-w-lg">
          <h2 className="text-[13px] font-bold text-warm-900 mb-1">Change Password</h2>
          <p className="text-[11px] text-warm-500 mb-4">Ensure your account is using a strong, unique password.</p>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Current Password *
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  id="currentPassword"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={handleCurrentPwChange}
                  placeholder="Enter current password"
                  className="w-full pl-8 pr-9 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showCurrentPw ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {pwFieldErrors.currentPassword && (
                <p className="text-red-600 text-[10px] mt-1">{pwFieldErrors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  id="newPassword"
                  type={showNewPw ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={handleNewPwChange}
                  placeholder="Enter new password"
                  className="w-full pl-8 pr-9 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showNewPw ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {pwFieldErrors.newPassword && (
                <p className="text-red-600 text-[10px] mt-1">{pwFieldErrors.newPassword}</p>
              )}

              {/* Live Password Rules Checklist */}
              {pwForm.newPassword.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-warm-50 border border-warm-100 rounded-md space-y-1">
                  <p className="text-[10px] font-bold text-warm-700 mb-1">Password Requirements:</p>
                  {pwCheck.rules.map((rule) => (
                    <div key={rule.key} className="flex items-center gap-1.5 text-[10px]">
                      {rule.passed ? (
                        <FiCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      ) : (
                        <FiX className="w-3 h-3 text-red-500 shrink-0" />
                      )}
                      <span className={rule.passed ? 'text-emerald-700 font-medium' : 'text-warm-600'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  id="confirmPassword"
                  type={showConfirmPw ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={handleConfirmPwChange}
                  placeholder="Re-enter new password"
                  className="w-full pl-8 pr-9 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showConfirmPw ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {(!confirmMatch || pwFieldErrors.confirmPassword) && (
                <p className="text-red-600 text-[10px] mt-1">
                  {pwFieldErrors.confirmPassword || 'Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pwSaving || !isPasswordFormValid}
              className="flex items-center justify-center gap-2 w-full py-2 bg-warm-900 text-white font-semibold text-[11px] rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50"
            >
              {pwSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[13px] font-bold text-warm-900">Delivery Addresses</h2>
            <button
              onClick={() => setShowAddAddr(!showAddAddr)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
            >
              <FiPlus className="w-3.5 h-3.5" /> Add New Address
            </button>
          </div>

          {showAddAddr && (
            <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-2.5 p-3.5 bg-white border border-warm-200 rounded-md shadow-xs">
              <div className="col-span-2">
                <input
                  value={addrForm.label}
                  onChange={(e) => handleAddrFieldChange('label', e.target.value)}
                  placeholder="Label (Home, Office)"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                />
              </div>

              <div className="col-span-2">
                <input
                  value={addrForm.line1}
                  onChange={(e) => handleAddrFieldChange('line1', e.target.value)}
                  placeholder="Address Line 1 *"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                {addrErrors.line1 && <p className="text-red-600 text-[10px] mt-0.5">{addrErrors.line1}</p>}
              </div>

              <div className="col-span-2">
                <input
                  value={addrForm.line2}
                  onChange={(e) => handleAddrFieldChange('line2', e.target.value)}
                  placeholder="Address Line 2"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                />
              </div>

              <div>
                <input
                  value={addrForm.city}
                  onChange={(e) => handleAddrFieldChange('city', e.target.value)}
                  placeholder="City *"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                {addrErrors.city && <p className="text-red-600 text-[10px] mt-0.5">{addrErrors.city}</p>}
              </div>

              <div>
                <input
                  value={addrForm.state}
                  onChange={(e) => handleAddrFieldChange('state', e.target.value)}
                  placeholder="State *"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                {addrErrors.state && <p className="text-red-600 text-[10px] mt-0.5">{addrErrors.state}</p>}
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={addrForm.pincode}
                  onKeyDown={(e) => handleNumericKeyDown(e, (msg) => showBlockedWarning(setAddrBlockedMsg, 'pincode', msg))}
                  onChange={(e) => handleAddrFieldChange('pincode', e.target.value)}
                  maxLength={6}
                  placeholder="Pincode (6 digits) *"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
                {addrBlockedMsg.pincode && (
                  <p className="text-amber-600 text-[10px] mt-0.5">{addrBlockedMsg.pincode}</p>
                )}
                {addrErrors.pincode && <p className="text-red-600 text-[10px] mt-0.5">{addrErrors.pincode}</p>}
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={addrForm.phone}
                  onKeyDown={(e) => handleNumericKeyDown(e, (msg) => showBlockedWarning(setAddrBlockedMsg, 'phone', msg))}
                  onChange={(e) => handleAddrFieldChange('phone', e.target.value)}
                  maxLength={10}
                  placeholder="Phone (10 digits)"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                />
                {addrBlockedMsg.phone && (
                  <p className="text-amber-600 text-[10px] mt-0.5">{addrBlockedMsg.phone}</p>
                )}
                {addrErrors.phone && <p className="text-red-600 text-[10px] mt-0.5">{addrErrors.phone}</p>}
              </div>

              <div className="col-span-2 flex gap-2 pt-1.5">
                <button
                  type="submit"
                  disabled={addrSaving || !isAddrValid}
                  className="px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 disabled:opacity-50 transition-colors"
                >
                  {addrSaving ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAddr(false)}
                  className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-600 hover:bg-warm-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {addresses.length === 0 ? (
              <p className="text-warm-400 text-[11px] col-span-2 py-6 text-center bg-white rounded-md border border-warm-200 shadow-xs">
                No saved addresses yet.
              </p>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id || addr._id} className="p-3.5 bg-white rounded-md border border-warm-200 shadow-xs text-[11px] space-y-1">
                  {addr.label && (
                    <span className="text-[10px] font-bold text-warm-900 uppercase tracking-wider block mb-1">
                      {addr.label}
                    </span>
                  )}
                  <p className="font-semibold text-warm-900">{addr.line1}</p>
                  {addr.line2 && <p className="text-warm-600">{addr.line2}</p>}
                  <p className="text-warm-600">{addr.city}, {addr.state} — {addr.pincode}</p>
                  {addr.phone && <p className="text-[10px] text-warm-400 mt-1.5">Phone: {addr.phone}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}