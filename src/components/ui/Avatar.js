import { cn } from '@/lib/cn';

const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
};

export default function Avatar({ user, size = 'sm', className }) {
  const base = cn('shrink-0 rounded-full', sizes[size], className);

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || 'User avatar'}
        className={cn(base, 'border border-warm-200 object-cover')}
      />
    );
  }

  return (
    <div className={cn(base, 'flex items-center justify-center bg-warm-900 font-bold text-white')}>
      {user?.name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}