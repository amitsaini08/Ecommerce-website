'use client';

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/common/Toast';

export function useMutation(fn) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args) => {
    setLoading(true);
    try {
      const data = await fnRef.current(...args);
      return data ?? true;
    } catch (err) {
      if (err?.name === 'AbortError') return undefined;
      toast.error(err?.message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { run, loading };
}

export default useMutation;
