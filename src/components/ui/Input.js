'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

const Input = forwardRef(function Input(
  { icon: Icon, error, type = 'text', className, ...props },
  ref
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
      )}

      <input
        ref={ref}
        type={isPassword && show ? 'text' : type}
        aria-invalid={!!error}
        className={cn(
          'h-10 w-full rounded-md border bg-white text-xs text-warm-900 transition-colors',
          'placeholder:text-warm-400 focus:outline-none focus:ring-2',
          Icon ? 'pl-10' : 'pl-3.5',
          isPassword ? 'pr-11' : 'pr-3.5',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-warm-300 focus:border-brand-600 focus:ring-brand-600/20',
          className
        )}
        {...props}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-warm-400 transition-colors hover:bg-warm-50 hover:text-warm-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
});

export default Input;