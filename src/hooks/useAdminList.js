'use client';

import { useState, useEffect, useCallback } from 'react';

// endpoint: '/api/admin/users', key: response mein list ka naam ('users')
export function useAdminList(endpoint, key) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${endpoint}?page=${page}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load data');

        setItems(data[key] || []);
        setPagination(data.pagination || { page, totalPages: 1 });
        setError('');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load data');
      }
      setLoading(false);
    })();

    return () => controller.abort();
  }, [endpoint, key, page, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { items, pagination, page, setPage, loading, error, reload };
}