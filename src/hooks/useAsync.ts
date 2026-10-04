import { useCallback, useEffect, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Re-runs `fn` whenever `deps` change; ignores stale results. `reload()` re-fetches without clearing data. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive && setState({ data, loading: false, error: null }),
      (e: unknown) => alive && setState((s) => ({ data: s.data, loading: false, error: e instanceof Error ? e.message : 'Something went wrong' })),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? (updater as (p: T | null) => T | null)(s.data) : updater }));
  }, []);
  return { ...state, reload, setData };
}
