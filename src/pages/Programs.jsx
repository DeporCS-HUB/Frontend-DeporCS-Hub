import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageTitle, Card, Badge, Progress } from '../components/UI';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import Editor from '../components/Editor';
import { useCollection } from '../lib/collections';
import { useAuth, money, date } from '../lib/hooks';
import { canUpdateProgram, programStatuses, programStatusLabel } from '../lib/programs';
export default function Programs() {
 const c = useCollection('programs'); const { user } = useAuth();
 const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [kind, setKind] = useState('');
 const [progressItem, setProgressItem] = useState(null);
 const rows = c.rows.filter(row => row.name.toLowerCase().includes(query.toLowerCase()) && (!status || row.status === status) && (!kind || row.kind === kind));
 return <><PageTitle title="Program kerja" subtitle="Proker dan UKOR: pembagian PJ, agenda, dan catatan progres." action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Tambah program</button>} />
 <Card><div className="table-tools"><div className="search"><Search /><input aria-label="Cari program" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari Proker atau UKOR…" /></div>
 <select aria-label="Filter jenis kegiatan" value={kind} onChange={event => setKind(event.target.value)}><option value="">Proker &amp; UKOR</option><option>Proker</option><option>UKOR</option></select>
 <select aria-label="Filter status program" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua status</option>{programStatuses.map(value => <option key={value} value={value}>{programStatusLabel(value)}</option>)}</select></div>
 <CollectionFeedback collection={c} />{!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table className="program-table"><thead><tr>{['Kegiatan','PJ','Progres','Agenda berikutnya','Anggaran','Tindakan'].map(value => <th key={value}>{value}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
 <td><Badge>{row.kind || 'Proker'}</Badge><b>{row.name}</b>{row.description && <details><summary>Deskripsi kegiatan</summary><p>{row.description}</p></details>}{(row.start_date || row.end_date) && <small>{date(row.start_date)}–{date(row.end_date)}</small>}</td>
 <td>{row.pic}</td><td><Badge>{programStatusLabel(row.status)}</Badge>{row.progress == null ? <small>Belum diisi</small> : <div className="progress-cell"><Progress value={row.progress} /><span>{row.progress}%</span></div>}{row.progress_notes && <small>{row.progress_notes}</small>}</td>
 <td>{row.next_milestone || 'Belum dijadwalkan'}<small>{row.milestone_date ? date(row.milestone_date) : 'Tanggal belum ditetapkan'}</small></td>
 <td>{row.budget == null ? 'Belum diisi' : money(row.budget)}</td><td>{canUpdateProgram(user,row) && <button className="secondary" onClick={() => setProgressItem(row)}>Update progres</button>}<RowActions collection={c} item={row} /></td>
 </tr>)}</tbody></table>{!rows.length && <p className="data-state">Tidak ada hasil untuk filter ini.</p>}</div>}<Pagination collection={c} /></Card>
 <CollectionEditor resource="programs" collection={c} />{progressItem && <Editor resource="programProgress" item={progressItem} onClose={() => setProgressItem(null)} onSaved={() => { setProgressItem(null); c.reload(); }} />}</>;
}
