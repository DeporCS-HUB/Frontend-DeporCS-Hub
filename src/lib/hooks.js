import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { api, authStore, dataStore, cachedResource, invalidateResource } from './api';
export function useAuth() { return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot); }
export function useResource(path) {
  const revision = useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot);
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([path, revision, version, user?.id, user?.role, user?.departmentRole]);
  const [state, setState] = useState(null);
  const reload = useCallback(() => { invalidateResource(path); setVersion(value => value + 1); }, [path]);
  const cached = cachedResource(path);
  const current = state?.key === key ? state : { key, data: cached ?? null, loading: cached === undefined, error: '' };
  useEffect(() => {
    let active = true;
    api(path).then(({ data }) => {
      if (active) setState({ key, data, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ key, data: null, loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [path, key]);
  return { ...current, reload };
}
export const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
export const date = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID') : '—';
