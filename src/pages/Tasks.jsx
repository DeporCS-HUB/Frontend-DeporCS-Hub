import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageTitle, Badge } from '../components/UI';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import { useCollection } from '../lib/collections';
import { api } from '../lib/api';
import { date } from '../lib/hooks';
const columns = ['Backlog','To Do','In Progress','Review','Done'];
export default function Tasks() {
  const c = useCollection('tasks'); const [dragged, setDragged] = useState(null);
  async function move(item, status) {
    setDragged(null); if (!item || item.status === status || c.busy || !c.canEdit(item)) return;
    c.setBusy(true); c.setMutationError('');
    const payload = Object.fromEntries(['title','description','program_id','assignee_id','priority','due_date'].map(key => [key, item[key] ?? null]));
    try { await api(`/tasks/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...payload, status }) }); c.reload(); }
    catch (error) { c.setMutationError(error.message); }
    finally { c.setBusy(false); }
  }
  return <><PageTitle title="Papan tugas" subtitle="Pembagian tugas dan progres pelaksanaan program." action={<button className="primary" onClick={() => c.setEditor({})}><Plus />Tambah tugas</button>} /><CollectionFeedback collection={c} />{!c.loading && !c.error && <div className="kanban" aria-busy={c.busy}>{columns.map(status => <div className="kanban-col" key={status} onDragOver={event => event.preventDefault()} onDrop={() => move(dragged, status)}><div className="kanban-head"><b>{status}</b><span>{c.rows.filter(row => row.status === status).length}</span></div>{c.rows.filter(row => row.status === status).map(row => <article key={row.id} draggable={c.canEdit(row) && !c.busy} onDragStart={() => setDragged(row)}><Badge tone={row.priority === 'High' ? 'red' : row.priority === 'Medium' ? 'orange' : 'cyan'}>{row.priority}</Badge><h3>{row.title}</h3><p>{row.description}</p><div className="task-footer"><small>{date(row.due_date)}</small></div>{c.canEdit(row) && <label className="task-status">Status<select aria-label={`Status ${row.title}`} disabled={c.busy} value={row.status} onChange={event => move(row, event.target.value)}>{columns.map(value => <option key={value}>{value}</option>)}</select></label>}<RowActions collection={c} item={row} /></article>)}<button className="add-card" onClick={() => c.setEditor({ status })}>+ Tambah tugas</button></div>)}</div>}<Pagination collection={c} /><CollectionEditor resource="tasks" collection={c} /></>;
}
