import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { api, authStore, dataStore } from './api';
export function useAuth() { return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot); }
export function useResource(path) {
  const revision = useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot);
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let active = true;
    const run = async () => {
      setState(value => ({ ...value, loading: true, error: '' }));
      try { const { data } = await api(path); if (active) setState({ data, loading: false, error: '' }); }
      catch (error) { if (active) setState(value => ({ ...value, loading: false, error: error.message })); }
    };
    run();
    return () => { active = false; };
  }, [path, version, revision]);
  return { ...state, reload };
}
export const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
export const date = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID') : '—';
