'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { signupSchema, passwordRules } from '@/lib/validations';
import AuthCard from '@/components/auth/AuthCard';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import PasswordRules from '@/components/auth/PasswordRules';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';

// Frontend-only schema: confirmPassword API ka hissa nahi hai
const signupFormSchema = signupSchema
  .extend({ confirmPassword: z.string().min(1, 'Please confirm your password') })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const PASSWORD_CHECKLIST = [
  { key: 'len', message: 'Must be at least 8 characters', label: 'At least 8 characters' },
  { key: 'upper', message: 'Must contain at least one uppercase letter', label: 'One uppercase letter' },
  { key: 'lower', message: 'Must contain at least one lowercase letter', label: 'One lowercase letter' },
  { key: 'num', message: 'Must contain at least one number', label: 'One number' },
  { key: 'special', message: 'Must contain at least one special character', label: 'One special character' },
];

function getPasswordChecklist(value) {
  const result = passwordRules.safeParse(value);
  const failed = new Set(result.success ? [] : result.error.issues.map((i) => i.message));
  return PASSWORD_CHECKLIST.map(({ key, message, label }) => ({
    key,
    label,
    passed: !failed.has(message),
  }));
}

export default function SignupPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupFormSchema),
    validationMode: 'onChange',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const showChecklist = password.length > 0;

  const onSubmit = async ({ confirmPassword, ...payload }) => {
    setGeneralError('');

    let res;
    try {
      res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setGeneralError('Network error. Please check your connection and try again.');
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const fields = ['name', 'email', 'password'];
      if (fields.includes(data?.field)) {
        setError(data.field, { message: data.error || data.message });
        return;
      }
      setGeneralError(data?.error || 'Signup failed. Please try again later.');
      return;
    }

    router.push('/login?registered=true');
  };

  const clearGeneral = () => setGeneralError('');

  return (
    <AuthCard
      title="Create account"
      subtitle="Join NovaHub for an elevated shopping experience"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
            Sign In
          </Link>
        </>
      }
    >
      {generalError && <Alert className="mb-4">{generalError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Full Name" htmlFor="signup-name" required error={errors.name?.message}>
          <Input
            id="signup-name"
            icon={User}
            placeholder="John Doe"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name', { onChange: clearGeneral })}
          />
        </Field>

        <Field label="Email Address" htmlFor="signup-email" required error={errors.email?.message}>
          <Input
            id="signup-email"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { onChange: clearGeneral })}
          />
        </Field>

        <div>
          {/* Checklist dikh raha ho to text error dobara nahi dikhate, sirf red border */}
          <Field
            label="Password"
            htmlFor="signup-password"
            required
            error={showChecklist ? undefined : errors.password?.message}
          >
            <Input
              id="signup-password"
              type="password"
              icon={Lock}
              placeholder="Enter password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password', { onChange: clearGeneral, deps: ['confirmPassword'] })}
            />
          </Field>
          {showChecklist && <PasswordRules rules={getPasswordChecklist(password)} />}
        </div>

        <Field
          label="Confirm Password"
          htmlFor="signup-confirm"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="signup-confirm"
            type="password"
            icon={Lock}
            placeholder="Re-enter password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              onChange: clearGeneral,
              validate: (value) => value === password || 'Passwords do not match'
            })}
          />
        </Field>

        <Button type="submit" variant="dark" loading={isSubmitting} className="mt-2 w-full">
          <span>Create Account</span>
          {!isSubmitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </AuthCard>
  );
}