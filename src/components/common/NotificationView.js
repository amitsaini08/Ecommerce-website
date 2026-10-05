'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAdminList } from '@/hooks/useAdminList';
import { useMutation } from '@/hooks/useMutation';
import { notificationsApi } from '@/lib/apiClient/notifications';
import { getSocket } from '@/lib/socket';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/cn';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { onNotificationsChanged } from '@/lib/notificationEvents';

export default function NotificationsView({ forRole = 'customer' }) {

    const [filter, setFilter] = useState('all');

    const { items, pagination, setPage, loading, error, reload } = useAdminList(
        `/api/notifications?forRole=${forRole}${filter === 'unread' ? '&unread=true' : ''}`,
        'notifications'
    );

    function changeFilter(next) {
        if (next === filter) return;
        setFilter(next);
        setPage(1);
    }

    const markAll = useMutation(() => notificationsApi.markAllRead(forRole));
    const remove = useMutation(notificationsApi.remove);

    useEffect(() => {
        const socket = getSocket();
        const onNew = (n) => n.forRole === forRole && reload();
        socket.on('notification:new', onNew);
        return () => socket.off('notification:new', onNew);
    }, [forRole, reload]);

    useEffect(() => onNotificationsChanged(reload), [reload]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notifications"
                subtitle={forRole === 'admin' ? 'Orders, stock and review alerts.' : 'Order updates and important alerts.'}
                actions={
                    items.length > 0 && (
                        <Button
                            variant="outline" size="sm" loading={markAll.loading}
                            onClick={async () => (await markAll.run())}>
                            <CheckCheck className="h-4 w-4" /> Mark all read
                        </Button>
                    )
                }
            />

            <div className="flex gap-2" role="tablist" aria-label="Filter notifications">
                {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' },].map((t) => (
                    <Button key={t.id}
                        role="tab" aria-selected={filter === t.id} size="sm"
                        pill variant={filter === t.id ? 'dark' : 'outline'}
                        onClick={() => changeFilter(t.id)}>
                        {t.label}
                    </Button>
                ))}
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
            ) : items.length === 0 ? (
                <EmptyState icon={Bell}
                    title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
                    description={filter === 'unread' ? 'No unread notifications.' : "We'll let you know when something happens."} />
            ) : (
                <ul className="divide-y divide-warm-100 overflow-hidden rounded-xl border border-warm-200 bg-white">
                    {items.map((n) => (
                        <li key={n.id} className={cn('flex items-start gap-3 px-4 py-4', !n.isRead && 'bg-brand-50/40')}>
                            <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand-500')} />
                            <Link
                                href={n.link}
                                onClick={() => !n.isRead && notificationsApi.markRead(n.id).catch(() => { })}
                                className="min-w-0 flex-1"
                            >
                                <p className="text-sm font-semibold text-warm-900">{n.title}</p>
                                {n.body && <p className="mt-0.5 text-sm text-warm-600">{n.body}</p>}
                                <p className="mt-1 text-xs text-warm-400">{timeAgo(n.createdAt)}</p>
                            </Link>
                            <IconButton
                                label="Delete notification"
                                onClick={async () => (await remove.run(n.id))}
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="h-4 w-4" />
                            </IconButton>
                        </li>
                    ))}
                </ul>
            )}

            {pagination.totalPages > 1 && (
                <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            )}
        </div>
    );
}