'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { setUser } from '@/lib/store/authSlice';
import { selectWishlistItems } from '@/lib/store/wishlistSlice';
import { syncWishlistOnAuth } from '@/lib/store/syncWishlist';
import { loginSchema } from '@/lib/validations';
import AuthCard from '@/components/auth/AuthCard';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';

function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const guestWishlistItems = useSelector(selectWishlistItems);

  const justRegistered = searchParams.get('registered') === 'true';
  const [generalError, setGeneralError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    revalidateMode: 'onSubmit',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setGeneralError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.field === 'email' || result.field === 'password') {
          setError(result.field, { message: result.error || result.message });
        } else {
          setGeneralError(result.error || 'Login failed');
        }
        return;
      }

      dispatch(setUser(result.user));
      await syncWishlistOnAuth(dispatch, guestWishlistItems);

      const redirect = searchParams.get('redirect');
      const safeRedirect = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : null;

      router.push(result.user.role === 'admin' ? '/admin' : safeRedirect || '/');
    } catch {
      setGeneralError('Network error. Please try again.');
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to NovaHub"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
            Create account
          </Link>
        </>
      }
    >
      {justRegistered && !generalError && (
        <Alert tone="success" className="mb-4">
          Account created. Please sign in.
        </Alert>
      )}
      {generalError && <Alert className="mb-4">{generalError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Email Address" htmlFor="login-email" required error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { onChange: () => { clearErrors('email'); setGeneralError('') } })}
          />
        </Field>

        <Field label="Password" htmlFor="login-password" required error={errors.password?.message}>
          <Input
            id="login-password"
            type="password"
            icon={Lock}
            placeholder="Enter password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { onChange: () => { clearErrors('password'); setGeneralError('') } })}
          />
        </Field>

        <Button type="submit" variant="dark" loading={isSubmitting} className="w-full">
          <span>Sign In</span>
          {!isSubmitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}