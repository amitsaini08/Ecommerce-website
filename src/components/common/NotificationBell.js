'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/cn';
import Dropdown from '@/components/ui/Dropdown';
import IconButton from '@/components/ui/IconButton';
import Button from '@/components/ui/Button';

export default function NotificationBell({forRole='customer'}) {
    const [open, setOpen] = useState(false);
    const { items, unreadCount, loading, markRead, markAllRead } = useNotifications(forRole);
    const push = usePushNotifications();

    return (
        <Dropdown
            open={open}
            onClose={() => setOpen(false)}
            align="right"
            className="w-80 p-0 sm:w-96"
            trigger={
                <IconButton label="Notifications" count={unreadCount} onClick={() => setOpen((o) => !o)}>
                    <Bell className="h-5 w-5" />
                </IconButton>}>

            <div className="flex items-center justify-between border-b border-warm-100 px-4 py-3">
                <h3 className="text-sm font-bold text-warm-900">Notifications</h3>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                    >
                        <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto">
                {loading ? (
                    <NotificationSkeleton count={2} />
                ) : items.length === 0 ? (
                    <p className="py-10 text-center text-sm text-warm-400">No Recent notifications yet</p>
                ) : (
                    <ul className="divide-y divide-warm-100">
                        {items.map((n) => (
                            <li key={n.id}>
                                <Link
                                    href={n.link}
                                    onClick={() => { markRead(n.id); setOpen(false); }}
                                    className={cn('flex gap-3 px-4 py-3 transition-colors hover:bg-warm-50', !n.isRead && 'bg-brand-50/40')} >
                                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand-500')} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-warm-900">{n.title}</p>
                                        {n.body && <p className="line-clamp-2 text-xs text-warm-600">{n.body}</p>}
                                        <p className="mt-1 text-xs text-warm-400">{timeAgo(n.createdAt)}</p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="border-t border-warm-100 p-2 text-center">
                <Link
                    href={forRole === 'customer' ? '/notifications' : '/admin/notifications'}
                    onClick={() => setOpen(false)}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                >
                    View all notifications
                </Link>
            </div>

            <AlertsPrompt push={push} />
        </Dropdown>
    );
}


const NotificationSkeleton = ({ count = 4 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <li key={index} className="flex gap-3 px-4 py-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warm-200 animate-pulse" />

                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-warm-200 animate-pulse" />
                        <div className="h-3 w-full rounded bg-warm-100 animate-pulse" />
                        <div className="h-3 w-2/3 rounded bg-warm-100 animate-pulse" />
                        <div className="mt-1 h-3 w-20 rounded bg-warm-100 animate-pulse" />
                    </div>
                </li>
            ))}
        </>
    );
};

function AlertsPrompt({ push }) {
  if (push.permission === 'unsupported') return null;

  if (push.permission === 'denied') {
    return (
      <p className="border-t border-warm-100 p-3 text-xs text-warm-500">
        Alerts are blocked in your browser. Click the lock icon next to the
        address bar and allow notifications to turn them on.
      </p>
    );
  }

 
  if (push.permission === 'default') {
    return (
      <div className="border-t border-warm-100 p-3">
        <p className="mb-2 text-xs text-warm-600">
          Get order updates on this device, even when the site is closed.
        </p>
        <Button size="sm" variant="dark" className="w-full" onClick={push.enable} loading={push.busy}>
          <Bell className="h-4 w-4" /> Turn on alerts
        </Button>
      </div>
    );
  }

  // granted: toggle
  return (
    <div className="flex items-center justify-between gap-3 border-t border-warm-100 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-warm-900">Alerts on this device</p>
        <p className="text-xs text-warm-500">Even when the site is closed</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={push.subscribed}
        aria-label="Alerts on this device"
        disabled={push.busy}
        onClick={push.subscribed ? push.disable : push.enable}
        className={cn(
          'relative h-5 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50',
          push.subscribed ? 'bg-brand-500' : 'bg-warm-300'
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            push.subscribed && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}