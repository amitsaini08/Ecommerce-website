'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, User, Check, X } from 'lucide-react';
import { checkPasswordRules, validateEmailFormat } from '@/lib/inputHelpers';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [generalError, setGeneralError] = useState('');

  const pwCheck = checkPasswordRules(form.password);
  const confirmMatch = !form.confirmPassword || form.password === form.confirmPassword;

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.email.trim() &&
    !validateEmailFormat(form.email) &&
    pwCheck.minLength &&
    pwCheck.hasUpper &&
    pwCheck.hasLower &&
    pwCheck.hasNumber &&
    pwCheck.hasSpecial &&
    form.confirmPassword &&
    form.password === form.confirmPassword;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, name: val }));
    setGeneralError('');
    if (!val.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: 'Name is required' }));
    } else if (val.trim().length < 2) {
      setFieldErrors((prev) => ({ ...prev, name: 'Name must be at least 2 characters' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, email: val }));
    setGeneralError('');
    setFieldErrors((prev) => ({ ...prev, email: validateEmailFormat(val) }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, password: val }));
    setGeneralError('');
    setFieldErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, confirmPassword: val }));
    setGeneralError('');
    if (val && form.password && val !== form.password) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({ name: '', email: '', password: '', confirmPassword: '' });

    if (!isFormValid) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: data.error || data.message }));
        } else {
          setGeneralError(data.error || 'Something went wrong');
        }
        return;
      }
      router.push('/login?registered=true')
    } catch {
      setGeneralError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white border border-warm-200 border-t-2 border-t-brand-500 rounded-md shadow-sm p-5 sm:p-6">
        {/* Header */}
        <h1 className="text-lg font-bold text-warm-900 tracking-tight">Create account</h1>
        <p className="text-[11px] text-warm-500 mt-1 mb-4">Join NovaHub for an elevated shopping experience</p>

        {/* General Error Alert */}
        {generalError && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="signup-name" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-name"
                type="text"
                value={form.name}
                onChange={handleNameChange}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="John Doe"
                required
              />
            </div>
            {fieldErrors.name && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            {fieldErrors.email && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handlePasswordChange}
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.password}</p>}

            {/* Password rules checklist */}
            {form.password.length > 0 && (
              <div className="mt-2 p-2 bg-warm-50 border border-warm-100 rounded-md space-y-1">
                <p className="text-[10px] font-bold text-warm-700">Password Requirements:</p>
                {pwCheck.rules.slice(0, 5).map((rule) => (
                  <div key={rule.key} className="flex items-center gap-1.5 text-[10px]">
                    {rule.passed ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-3 h-3 text-red-500 shrink-0" />
                    )}
                    <span className={rule.passed ? 'text-emerald-700 font-medium' : 'text-warm-600'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="signup-confirm" className="block text-[10px] font-semibold text-warm-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleConfirmChange}
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                placeholder="Re-enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {(!confirmMatch || fieldErrors.confirmPassword) && (
              <p className="text-red-600 text-[10px] mt-1">
                {fieldErrors.confirmPassword || 'Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-warm-100 text-center">
          <p className="text-[11px] text-warm-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}