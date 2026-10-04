import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Keeps list filters in the URL so back/forward and refresh preserve them. */
export function useQueryState() {
  const [sp, setSp] = useSearchParams();
  const get = useCallback((k: string, fallback = '') => sp.get(k) ?? fallback, [sp]);
  const getNum = useCallback((k: string, fallback: number) => {
    const v = Number(sp.get(k));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  }, [sp]);
  const set = useCallback(
    (patch: Record<string, string | number | boolean | undefined | null>, resetPage = true) => {
      const next = new URLSearchParams(sp);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '' || v === false || v === 'all') next.delete(k);
        else next.set(k, String(v));
      });
      if (resetPage && !('page' in patch)) next.delete('page');
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );
  return { sp, get, getNum, set };
}
