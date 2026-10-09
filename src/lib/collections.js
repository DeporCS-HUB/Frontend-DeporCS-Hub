import { useState } from 'react';
import { api } from './api';
import { useAuth, useResource } from './hooks';
export function useCollection(resource) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const result = useResource(`/${resource}?size=100&page=${page}`);
  const [editor, setEditor] = useState(null);
  const [mutationError, setMutationError] = useState('');
  const [busy, setBusy] = useState(false);
  const manages = user.role === 'staff' || user.role === 'admin';
  const canEdit = item => manages || (resource === 'tasks' && (!item || item.created_by === user.id || item.assignee_id === user.id));
  async function remove(item) {
    if (!window.confirm('Hapus data ini?')) return;
    setBusy(true); setMutationError('');
    try { await api(`/${resource}/${item.id}`, { method: 'DELETE' }); result.reload(); }
    catch (error) { setMutationError(error.message); }
    finally { setBusy(false); }
  }
  function saved() { setEditor(null); setMutationError(''); result.reload(); }
  return { ...result, rows: result.data || [], editor, setEditor, mutationError, setMutationError, busy, setBusy, manages, canEdit, remove, saved, page, setPage };
}
