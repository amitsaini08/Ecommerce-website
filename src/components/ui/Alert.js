import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const tones = {
  error: { box: 'border-red-200 bg-red-50 text-red-700', Icon: AlertCircle },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle },
};

export default function Alert({ tone = 'error', className, children }) {
  const { box, Icon } = tones[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm', box, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}