import { useEffect, useState } from 'react';
import { api } from './api';
import { canManage } from './roles';
import { useAuth, useResource } from './hooks';
export function useCollection(resource, filters = {}, size = 20) {
  const rawQuery = filters.q || '';
  const [query, setQuery] = useState(rawQuery);
  useEffect(() => { const timer = setTimeout(() => setQuery(rawQuery), 250); return () => clearTimeout(timer); }, [rawQuery]);
  const params = new URLSearchParams(Object.entries({ ...filters, q: query }).filter(([,value]) => value !== '' && value != null));
  const filterKey = params.toString();
  const [cursor, setCursor] = useState({ key: filterKey, page: 0 });
  if (cursor.key !== filterKey) setCursor({ key: filterKey, page: 0 });
  const page = cursor.key === filterKey ? cursor.page : 0;
  const setPage = next => setCursor({ key: filterKey, page: typeof next === 'function' ? next(page) : next });
  params.set('size', String(size)); params.set('page', String(page));
  const { user } = useAuth();
  const result = useResource(`/${resource}?${params}`);
  const searching = query !== rawQuery;
  const [editor, setEditor] = useState(null);
  const [mutationError, setMutationError] = useState('');
  const [busy, setBusy] = useState(false);
  const manages = canManage(user);
  const canEdit = item => manages || (resource === 'tasks' && (!item || item.created_by === user.id || item.assignee_id === user.id));
  async function remove(item) {
    if (!window.confirm('Hapus data ini?')) return;
    setBusy(true); setMutationError('');
    try { await api(`/${resource}/${item.id}`, { method: 'DELETE' }); result.reload(); }
    catch (error) { setMutationError(error.message); }
    finally { setBusy(false); }
  }
  function saved() { setEditor(null); setMutationError(''); result.reload(); }
  return { ...result, loading: result.loading || searching, size, hasMore: result.meta?.hasMore ?? (result.data?.length === size), rows: searching ? [] : result.data || [], editor, setEditor, mutationError, setMutationError, busy, setBusy, manages, canEdit, remove, saved, page, setPage };
}
