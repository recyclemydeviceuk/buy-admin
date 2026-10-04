import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { AdminUser, Permission, Role } from '../types';

interface Ctx {
  user: AdminUser | null;
  role: Role | null;
  ready: boolean;
  /** Set when the backend could not be reached during the session check. */
  offline: boolean;
  retry: () => void;
  signIn: (user: AdminUser, role: Role) => void;
  signOut: () => Promise<void>;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setOffline(false);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000));
    Promise.race([api.me(), timeout])
      .then((s) => {
        if (!alive) return;
        setUser(s?.user ?? null);
        setRole(s?.role ?? null);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setOffline(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const signIn = useCallback((u: AdminUser, r: Role) => {
    setUser(u);
    setRole(r);
  }, []);
  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    setRole(null);
  }, []);
  const can = useCallback<Ctx['can']>((p) => !!role?.permissions.includes(p), [role]);
  const canAny = useCallback<Ctx['canAny']>((ps) => ps.some((p) => role?.permissions.includes(p)), [role]);
  const value = useMemo(() => ({ user, role, ready, offline, retry, signIn, signOut, can, canAny }), [user, role, ready, offline, retry, signIn, signOut, can, canAny]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
