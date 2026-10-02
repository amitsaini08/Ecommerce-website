import { useEffect } from 'react';

export function useOutsideClick(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return;

    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handler();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, handler, active]);
}