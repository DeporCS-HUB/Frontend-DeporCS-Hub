import AvatarDirectory from '../components/AvatarDirectory';
import AccountIdentity from '../components/AccountIdentity';
import { useEffect, useState } from 'react';
import { Plus, LayoutGrid, List, Search, X, ArrowRight, GripVertical, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTitle, Badge } from '../components/UI';
import { CollectionFeedback, Pagination } from '../components/CollectionTools';
import Editor from '../components/Editor';
import DetailsDialog from '../components/DetailsDialog';
import { useCollection } from '../lib/collections';
import { api, refreshData } from '../lib/api';
import { useAuth, useResource, useDirectory, date } from '../lib/hooks';
import { canManage } from '../lib/roles';
import { accountLabel, isOverdue, taskStatuses, taskStatusLabels, taskTone } from '../lib/tasks';
function TaskCard({ row, actions }) {
 const name = accountLabel(actions.profiles, row.assignee_id); const overdue = isOverdue(row);
 return <article className={`work-task ${overdue ? 'is-overdue' : ''}`} draggable={actions.canEdit(row) && !actions.busy}
 onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', row.id); actions.setDragged(row); }} onDragEnd={() => actions.setDragged(null)}>
 <div className="work-task-top"><Badge tone={row.priority === 'High' ? 'red' : row.priority === 'Medium' ? 'orange' : 'cyan'}>{{ High: 'Tinggi', Medium: 'Sedang', Low: 'Rendah' }[row.priority]}</Badge>{actions.canEdit(row) && <span className="task-drag-handle" draggable={!actions.busy} title="Geser kartu" aria-hidden="true"><GripVertical size={14} /></span>}</div>
 <h3>{row.title}</h3>{!actions.programId && row.program_id && <small className="task-program">{actions.programs.find(p => p.id === row.program_id)?.name || 'Program'}</small>}
 <div className="work-task-meta"><AccountIdentity profiles={actions.profiles} id={row.assignee_id} name={name} /><small className={overdue ? 'deadline-overdue' : ''}>{overdue && 'Terlambat · '}{date(row.due_date)}</small></div>
 {actions.canEdit(row) && <label className="task-status"><span className="sr-only">Status {row.title}</span><select aria-label={`Status ${row.title}`} value={row.status} disabled={actions.busy} onChange={event => actions.move(row, event.target.value)}>{taskStatuses.map(s => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}</select></label>}
 <div className="work-task-actions"><button className="text-button" disabled={actions.busy} onClick={() => actions.openTask(row, 'detail')}>Detail</button>{actions.canEdit(row) && <><button className="text-button" disabled={actions.busy} onClick={() => actions.openTask(row, 'editor')}>Edit</button><button className="text-button danger-text" disabled={actions.busy} onClick={() => actions.remove(row)}>Hapus</button></>}</div>
 </article>;
}
function TaskColumn({ status, collection: c, actions, count }) {
 const [target, setTarget] = useState(false);
 return <section className={`work-column ${target ? 'drop-target' : ''}`} aria-label={taskStatusLabels[status]}
 onDragOver={e => { if (actions.dragged && actions.canEdit(actions.dragged)) { e.preventDefault(); setTarget(true); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setTarget(false); }}
 onDrop={e => { e.preventDefault(); setTarget(false); if (e.dataTransfer.getData('text/plain') === actions.dragged?.id) actions.move(actions.dragged, status); }}>
 <header className="work-column-head"><span className={`status-dot status-${taskTone(status)}`} /><h2>{taskStatusLabels[status]}</h2><span className="column-count">{count ?? '—'}</span><button className="icon-action" aria-label={`Tambah tugas ${taskStatusLabels[status]}`} onClick={() => actions.setEditor({ status, program_id: actions.programId || null })}><Plus size={16} /></button></header>
 <div className="work-column-body"><CollectionFeedback collection={c} />{!c.loading && !c.error && c.rows.map(row => <TaskCard key={row.id} row={row} actions={actions} />)}</div>
 {(c.page > 0 || c.hasMore) && <div className="column-pages"><button disabled={!c.page || c.loading} onClick={() => c.setPage(p => p - 1)} aria-label={`Sebelumnya ${taskStatusLabels[status]}`}>←</button><small>Halaman {c.page + 1}</small><button disabled={!c.hasMore || c.loading} onClick={() => c.setPage(p => p + 1)} aria-label={`Berikutnya ${taskStatusLabels[status]}`}>→</button></div>}
 <button className="add-card" onClick={() => actions.setEditor({ status, program_id: actions.programId || null })}>+ Tambah tugas</button>
 </section>;
}
function TaskList({ filters, actions }) {
 const c = useCollection('tasks', filters, 20);
 return <section className="card task-list-view"><CollectionFeedback collection={c} />{!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table><thead><tr><th>Tugas</th><th>PJ</th><th>Status</th><th>Tenggat</th><th>Tindakan</th></tr></thead><tbody>{c.rows.map(row => <tr key={row.id}><td><b>{row.title}</b><small className="block">{actions.programs.find(p => p.id === row.program_id)?.name || 'Tugas mandiri'}</small></td><td><AccountIdentity profiles={actions.profiles} id={row.assignee_id} /></td><td>{actions.canEdit(row) ? <select aria-label={`Status ${row.title}`} disabled={actions.busy} value={row.status} onChange={e => actions.move(row, e.target.value)}>{taskStatuses.map(s => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}</select> : <Badge tone={`status-${taskTone(row.status)}`}>{taskStatusLabels[row.status]}</Badge>}</td><td className={isOverdue(row) ? 'deadline-overdue' : ''}>{date(row.due_date)}</td><td><button className="secondary" onClick={() => actions.openTask(row, 'detail')}>Detail</button>{actions.canEdit(row) && <button className="text-button" onClick={() => actions.openTask(row, 'editor')}>Edit</button>}</td></tr>)}</tbody></table></div>}<Pagination collection={c} /></section>;
}
export default function Tasks({ programId, programAssignees }) {
 const { user } = useAuth(); const manages = canManage(user);
 const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
 useEffect(() => { const timer = setTimeout(() => setSearch(query), 250); return () => clearTimeout(timer); }, [query]);
 const [priority, setPriority] = useState(''); const [program, setProgram] = useState(''); const [assignee, setAssignee] = useState(''); const [scope, setScope] = useState(''); const [status, setStatus] = useState(''); const [view, setView] = useState('board');
 const filters = { q: query, priority, program_id: programId || program, assignee_id: assignee, scope, status };
 const params = new URLSearchParams(Object.entries({ ...filters, q: search }).filter(([,v]) => v));
 const filterKey = params.toString();
 const [cursor, setCursor] = useState({ key: filterKey, pages: [0,0,0,0,0] });
 if (cursor.key !== filterKey) setCursor({ key: filterKey, pages: [0,0,0,0,0] });
 const pages = cursor.key === filterKey ? cursor.pages : [0,0,0,0,0];
 const board = useResource(view === 'board' ? `/tasks/board?${params}&pages=${pages.join(',')}` : null);
 const listSummary = useResource(view === 'list' ? `/tasks/summary?${params}` : null);
 const summary = view === 'board' ? { ...board, data: board.data?.summary } : listSummary;
 const searching = query !== search;
 function column(status) {
  const index = taskStatuses.indexOf(status);
  const setPage = next => setCursor(previous => {
   const current = previous.key === filterKey ? previous.pages : [0,0,0,0,0];
   return { key: filterKey, pages: current.map((page,i) => i === index ? typeof next === 'function' ? next(page) : next : page) };
  });
  return { rows: searching ? [] : board.data?.columns?.[status]?.items || [], loading: board.loading || searching, error: board.error, reload: board.reload, hasMore: board.data?.columns?.[status]?.hasMore, page: pages[index], setPage };
 }
 const profileDirectory = useDirectory('profiles'); const programDirectory = useDirectory('programs');
 const directory = { profiles: profileDirectory.data, programs: programDirectory.data };
 const directoryError = profileDirectory.error || programDirectory.error;
 const [editor, setEditor] = useState(null); const [detail, setDetail] = useState(null); const [dragged, setDragged] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [announcement, setAnnouncement] = useState('');
 const canEdit = row => manages || row.created_by === user.id || row.assignee_id === user.id;
 async function openTask(row, mode) {
  if (busy) return; setBusy(true); setError('');
  try {
   const { data } = await api(`/tasks/${row.id}`, { force: mode === 'editor' });
   if (mode === 'editor' && !canEdit(data)) throw new Error('Tugas ini sudah berubah atau tidak dapat Anda edit.');
   if (mode === 'editor') setEditor(data); else setDetail(data);
  } catch (e) { setError(e.message); } finally { setBusy(false); }
 }
 async function move(row, next) {
  setDragged(null); if (!row || !canEdit(row) || busy || row.status === next) return;
  setBusy(true); setError(''); setAnnouncement('');
  try { await api(`/tasks/${row.id}/status`, { method: 'PUT', body: JSON.stringify({ status: next, expected_updated_at: row.updated_at || null }) }); setAnnouncement(`${row.title}: ${taskStatusLabels[next]}`); }
  catch (e) { setError(e.message); } finally { setBusy(false); }
 }
 async function remove(row) { if (busy || !canEdit(row) || !window.confirm('Hapus tugas ini?')) return; setBusy(true); setError(''); try { await api(`/tasks/${row.id}`, { method: 'DELETE' }); } catch (e) { setError(e.message); } finally { setBusy(false); } }
 function reset() { setQuery(''); setPriority(''); setProgram(''); setAssignee(''); setScope(''); setStatus(''); }
 const actions = { ...directory, programId, canEdit, move, remove, busy, setEditor, openTask, dragged, setDragged };
 const stats = summary.data; const filtered = Boolean(query || priority || program || assignee || scope || status);
 return <AvatarDirectory profiles={directory.profiles}><div className={`task-workspace ${programId ? 'embedded-tasks' : ''}`}>
 {!programId && <PageTitle title="Papan tugas" subtitle={manages ? 'Pantau pekerjaan tim, beban PJ, dan tenggat.' : 'Pekerjaan Anda dan program yang Anda tangani.'} action={<button className="primary" onClick={() => setEditor({})}><Plus />Tambah tugas</button>} />}
 <div className="task-metrics" aria-label="Ringkasan tugas sesuai filter">{[['Total tugas', stats?.total, '', ''], ['Selesai', stats?.done, '', 'Done'], ['Terlambat', stats?.overdue, 'overdue', ''], ['Belum ada PJ', stats?.unassigned, 'unassigned', '']].map(([label, value, nextScope, nextStatus]) => <button key={label} className={`task-metric ${label === 'Terlambat' ? 'metric-warning' : ''}`} aria-pressed={label === 'Total tugas' ? !scope && !status : scope === nextScope && status === nextStatus} onClick={() => { setScope(nextScope); setStatus(nextStatus); }}><span>{label}</span><strong>{summary.loading ? '…' : value ?? '—'}</strong><ArrowRight size={16} /></button>)}</div>
 {summary.error && <p role="alert" className="error">{summary.error} <button className="text-button" onClick={summary.reload}>Coba lagi</button></p>}
 <div className="task-toolbar"><div className="search task-search"><Search size={17} /><input aria-label="Cari tugas" maxLength={120} placeholder="Cari judul atau deskripsi…" value={query} onChange={e => setQuery(e.target.value)} /></div><button className="secondary refresh-tasks" aria-label="Muat ulang tugas" title="Muat ulang tugas" onClick={refreshData}><RefreshCw size={16} /></button><div className="view-switch" aria-label="Tampilan tugas"><button aria-pressed={view === 'board'} onClick={() => setView('board')}><LayoutGrid size={16} />Papan</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} />Daftar</button></div><button className="primary" onClick={() => setEditor({ program_id: programId || program || null })}><Plus size={16} />Tugas baru</button></div>
 <div className="task-filters">{!programId && <select aria-label="Filter program tugas" value={program} onChange={e => setProgram(e.target.value)}><option value="">Semua program</option>{directory.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}<select aria-label="Filter akun PJ" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Semua akun PJ</option>{directory.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select aria-label="Filter prioritas" value={priority} onChange={e => setPriority(e.target.value)}><option value="">Semua prioritas</option>{['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{{ Low: 'Rendah', Medium: 'Sedang', High: 'Tinggi' }[p]}</option>)}</select><button className={`filter-chip ${scope === 'mine' ? 'selected' : ''}`} aria-pressed={scope === 'mine'} onClick={() => { setScope(scope === 'mine' ? '' : 'mine'); setStatus(''); }}>Tugas saya</button>{filtered && <button className="text-button" onClick={reset}><X size={14} />Reset filter</button>}<small>{summary.loading ? 'Menghitung…' : `${stats?.total ?? '—'} tugas sesuai filter`}</small></div>
 {directoryError && <p className="error" role="alert">Daftar akun/program gagal dimuat: {directoryError}</p>}{error && <p className="error" role="alert">{error}</p>}<span className="sr-only" role="status">{announcement}</span>
 {manages && stats?.workload?.length > 0 && <details className="workload-panel"><summary>Beban tugas per akun <small>{stats.workload.length} kelompok · sesuai filter</small></summary><div className="workload-grid">{stats.workload.map(w => <button key={w.assignee_id || 'unassigned'} onClick={() => { setAssignee(w.assignee_id || ''); setScope(w.assignee_id ? '' : 'unassigned'); }}><AccountIdentity profiles={directory.profiles} id={w.assignee_id} photoOnly /><span><b>{accountLabel(directory.profiles, w.assignee_id)}</b><small>{w.done} selesai · {w.open} terbuka{w.overdue > 0 && ` · ${w.overdue} terlambat`}</small></span><span className="workload-track" aria-hidden="true"><i style={{ width: `${w.total ? 100 * w.done / w.total : 0}%` }} /></span></button>)}</div></details>}
 {view === 'board' ? <><p className="board-help">Geser kartu atau gunakan pilihan status. Setiap kolom memiliki halaman sendiri.</p><div className="work-board" aria-busy={busy || board.loading}>{!board.error && taskStatuses.filter(s => !status || s === status).map(s => <TaskColumn key={s} status={s} collection={column(s)} actions={actions} count={stats?.statuses?.[s] ?? (stats ? 0 : null)} />)}</div></> : <TaskList filters={filters} actions={actions} />}
 {editor && <Editor resource="tasks" item={editor} programId={programId} programAssignees={programAssignees} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setError(''); }} />}
 {detail && <DetailsDialog item={{ ...detail, assignee_name: accountLabel(directory.profiles, detail.assignee_id), assignee_identity: <AccountIdentity profiles={directory.profiles} id={detail.assignee_id} />, program_name: directory.programs.find(p => p.id === detail.program_id)?.name }} onClose={() => setDetail(null)} />}
 {!programId && program && <Link className="program-context-link" to={`/programs/${program}`}>Buka ruang kerja program <ArrowRight size={15} /></Link>}
 </div></AvatarDirectory>;
}
