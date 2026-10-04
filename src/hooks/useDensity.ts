import { useCallback, useEffect, useState } from 'react';
import { readJson, writeJson } from '../lib/storage';

export type Density = 'compact' | 'comfortable';
const KEY = 'buyupon.admin.density';
const listeners = new Set<(d: Density) => void>();

/** Table row density, shared across every list and remembered per browser. */
export function useDensity(): [Density, (d: Density) => void] {
  const [d, setD] = useState<Density>(() => readJson<Density>(KEY, 'compact'));
  useEffect(() => {
    listeners.add(setD);
    return () => void listeners.delete(setD);
  }, []);
  const set = useCallback((n: Density) => {
    writeJson(KEY, n);
    listeners.forEach((l) => l(n));
  }, []);
  return [d, set];
}
