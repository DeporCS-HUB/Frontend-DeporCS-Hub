import AvatarDirectory from '../components/AvatarDirectory';
import AccountIdentity from '../components/AccountIdentity';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { PageTitle, Card, Badge, Progress } from '../components/UI';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import Editor from '../components/Editor';
import { useCollection } from '../lib/collections';
import { useAuth, useDirectory, date } from '../lib/hooks';
import { canUpdateProgram, programStatuses, programStatusLabel, programStatusGroup } from '../lib/programs';
export default function Programs() {
 const { user } = useAuth();
 const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [kind, setKind] = useState('');
 const [progressItem, setProgressItem] = useState(null);
 const c = useCollection('programs', { q: query, status, kind }, 10);
 const rows = c.rows;
 const directory = useDirectory('profiles');
 const profiles = directory.data || [];
 return <AvatarDirectory profiles={profiles}><PageTitle title="Program kerja" subtitle="Proker & UKOR" action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Tambah program</button>} />
 <Card><div className="table-tools"><div className="search"><Search /><input maxLength={120} aria-label="Cari program" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari Proker atau UKOR…" /></div>
 <select aria-label="Filter jenis kegiatan" value={kind} onChange={event => setKind(event.target.value)}><option value="">Proker &amp; UKOR</option><option>Proker</option><option>UKOR</option></select>
 <select aria-label="Filter status program" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua status</option>{programStatuses.map(value => <option key={value} value={value}>{programStatusLabel(value)}</option>)}</select></div>
 {directory.error && <p className="error" role="alert">Daftar akun tidak tersedia. <button className="text-button" onClick={directory.reload}>Coba lagi</button></p>}<CollectionFeedback collection={c} />{!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table className="program-table"><thead><tr>{['Kegiatan','PJ','Progres','Agenda','Tindakan'].map(value => <th key={value}>{value}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
 <td data-label="Kegiatan"><div className="program-name"><b>{row.name}</b><Badge>{row.kind || 'Proker'}</Badge></div></td>
 <td data-label="PJ"><div className="program-pj-list">{row.assignee_ids?.length ? row.assignee_ids.map(id => <AccountIdentity key={id} profiles={profiles} id={id} />) : <span className="compact-pic">Belum ada akun PJ</span>}</div></td><td data-label="Progres"><Badge tone={`status-${programStatusGroup(row.status)}`}>{programStatusLabel(row.status)}</Badge>{row.progress == null ? (row.status !== 'Unspecified' && <small>Belum diisi</small>) : <div className="progress-cell"><Progress value={row.progress} status={row.status} /><span>{row.progress}%</span></div>}</td>
 <td data-label="Agenda"><span className="compact-agenda" title={row.next_milestone || undefined}>{row.milestone_date ? date(row.milestone_date) : '—'}</span></td>
 <td data-label="Tindakan"><div className="program-actions"><Link className="secondary program-link" to={`/programs/${row.id}`}>Buka program</Link>{canUpdateProgram(user,row) && <button className="secondary" onClick={() => setProgressItem(row)}>Update progres</button>}<RowActions collection={c} item={row} /></div></td>
 </tr>)}</tbody></table>{!rows.length && <p className="data-state">Tidak ada hasil untuk filter ini.</p>}</div>}<Pagination collection={c} /></Card>
 <CollectionEditor resource="programs" collection={c} />{progressItem && <Editor resource="programProgress" item={progressItem} onClose={() => setProgressItem(null)} onSaved={() => { setProgressItem(null); c.reload(); }} />}</AvatarDirectory>;
}
