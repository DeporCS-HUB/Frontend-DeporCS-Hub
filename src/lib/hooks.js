import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { api, authStore, dataStore, cachedResponse, invalidateResource } from './api';
export function useAuth() { return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot); }
export function useResource(path) {
  const revision = useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot);
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([path, revision, version, user?.id, user?.role, user?.departmentRole]);
  const [state, setState] = useState(null);
  const reload = useCallback(() => { if (path) invalidateResource(path); setVersion(value => value + 1); }, [path]);
  const cached = path ? cachedResponse(path) : undefined;
  const current = state?.key === key ? state : { key, data: cached?.data ?? null, meta: cached?.meta, loading: Boolean(path) && cached === undefined, error: '' };
  useEffect(() => {
    if (!path) return;
    let active = true;
    api(path).then(({ data, meta }) => {
      if (active) setState({ key, data, meta, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ key, data: null, loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [path, key]);
  return { ...current, reload };
}
export const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
export const date = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID') : '—';

export function useDirectory(resource) {
  const result = useResource('/directory');
  return { ...result, data: result.data?.[resource] || [] };
}
