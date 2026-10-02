import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function PasswordRules({ rules }) {
  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-warm-100 bg-warm-50 p-3">
      <p className="text-xs font-bold text-warm-700">Password requirements</p>
      <ul className="space-y-1">
        {rules.map((rule) => (
          <li key={rule.key} className="flex items-center gap-2 text-xs">
            {rule.passed ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
            )}
            <span className={cn(rule.passed ? 'font-medium text-emerald-700' : 'text-warm-600')}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}