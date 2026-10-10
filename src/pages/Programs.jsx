import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageTitle, Card, Badge, Progress } from '../components/UI';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import Editor from '../components/Editor';
import DetailsDialog from '../components/DetailsDialog';
import { useCollection } from '../lib/collections';
import { useAuth, date } from '../lib/hooks';
import { canUpdateProgram, programStatuses, programStatusLabel } from '../lib/programs';
export default function Programs() {
 const c = useCollection('programs'); const { user } = useAuth();
 const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [kind, setKind] = useState('');
 const [progressItem, setProgressItem] = useState(null); const [detailItem, setDetailItem] = useState(null);
 const rows = c.rows.filter(row => row.name.toLowerCase().includes(query.toLowerCase()) && (!status || row.status === status) && (!kind || row.kind === kind));
 return <><PageTitle title="Program kerja" subtitle="Proker & UKOR" action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Tambah program</button>} />
 <Card><div className="table-tools"><div className="search"><Search /><input aria-label="Cari program" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari Proker atau UKOR…" /></div>
 <select aria-label="Filter jenis kegiatan" value={kind} onChange={event => setKind(event.target.value)}><option value="">Proker &amp; UKOR</option><option>Proker</option><option>UKOR</option></select>
 <select aria-label="Filter status program" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua status</option>{programStatuses.map(value => <option key={value} value={value}>{programStatusLabel(value)}</option>)}</select></div>
 <CollectionFeedback collection={c} />{!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table className="program-table"><thead><tr>{['Kegiatan','PJ','Progres','Agenda','Tindakan'].map(value => <th key={value}>{value}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
 <td data-label="Kegiatan"><div className="program-name"><b>{row.name}</b><Badge>{row.kind || 'Proker'}</Badge></div></td>
 <td data-label="PJ"><span className="compact-pic" title={row.pic}>{row.pic}</span></td><td data-label="Progres"><Badge>{programStatusLabel(row.status)}</Badge>{row.progress == null ? (row.status !== 'Unspecified' && <small>Belum diisi</small>) : <div className="progress-cell"><Progress value={row.progress} /><span>{row.progress}%</span></div>}</td>
 <td data-label="Agenda"><span className="compact-agenda" title={row.next_milestone || undefined}>{row.milestone_date ? date(row.milestone_date) : '—'}</span></td>
 <td data-label="Tindakan"><div className="program-actions"><button className="secondary" onClick={() => setDetailItem(row)}>Detail</button>{canUpdateProgram(user,row) && <button className="secondary" onClick={() => setProgressItem(row)}>Update progres</button>}<RowActions collection={c} item={row} /></div></td>
 </tr>)}</tbody></table>{!rows.length && <p className="data-state">Tidak ada hasil untuk filter ini.</p>}</div>}<Pagination collection={c} /></Card>
 {detailItem && <DetailsDialog item={detailItem} program onClose={() => setDetailItem(null)} />}
 <CollectionEditor resource="programs" collection={c} />{progressItem && <Editor resource="programProgress" item={progressItem} onClose={() => setProgressItem(null)} onSaved={() => { setProgressItem(null); c.reload(); }} />}</>;
}
