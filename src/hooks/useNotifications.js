'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/store/authSlice';
import { notificationsApi } from '@/lib/apiClient/notifications';
import { onNotificationsChanged } from '@/lib/notificationEvents';
import { getSocket } from '@/lib/socket';

export function useNotifications(forRole = 'customer') {
  const userId = useSelector(selectUser)?._id;

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (signal, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await notificationsApi.list(`?limit=10&forRole=${forRole}`, { signal });
        setItems(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {}
      if (!silent) setLoading(false);
    },
    [forRole]
  );

  // pehli baar + user badalne par
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [userId, load]);

  // doosri jagah (page) se kuch badla to sync
  useEffect(() => {
    if (!userId) return;
    return onNotificationsChanged(() => load(undefined, true));
  }, [userId, load]);

  // real-time
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    const onNew = (n) => {
      if (n.forRole !== forRole) return;
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 10)));
      setUnreadCount((c) => c + 1);
    };

    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [userId, forRole]);

  const markRead = useCallback(async (id) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.isRead) wasUnread = true;
        return n.id === id ? { ...n, isRead: true } : n;
      })
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead(forRole);
    } catch {}
  }, [forRole]);

  return { items, unreadCount, loading, markRead, markAllRead };
}