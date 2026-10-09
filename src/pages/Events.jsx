import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageTitle, Card, Badge } from '../components/UI';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import { useCollection } from '../lib/collections';
import { date } from '../lib/hooks';

export default function Events() {
  const c = useCollection('events');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const rows = c.rows.filter(row => `${row.name} ${row.venue}`.toLowerCase().includes(query.toLowerCase()) && (!status || row.permit_status === status));
  return <><PageTitle title="Event & Permit Center" subtitle="Jadwal kegiatan dan pencatatan izin venue" action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Add Event</button>} />
    <Card><p>Status izin dicatat BPH berdasarkan konfirmasi pengelola venue. Aplikasi tidak mengirim pengajuan atau menerbitkan izin.</p>
      <div className="table-tools"><div className="search local"><Search /><input aria-label="Search events" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama atau venue di halaman ini…" /></div><select aria-label="Permit status filter" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua izin</option>{['Not required','Pending','Approved','Rejected'].map(value => <option key={value}>{value}</option>)}</select></div>
      <CollectionFeedback collection={c} />
      {!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table><thead><tr>{['Kegiatan','Venue','Tanggal','Status','Izin','Actions'].map(value => <th key={value}>{value}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><b>{row.name}</b><small>{row.description}</small></td><td>{row.venue}</td><td>{date(row.start_date)}–{date(row.end_date)}</td><td><Badge>{row.status}</Badge></td><td><Badge>{row.permit_status}</Badge></td><td><RowActions collection={c} item={row} /></td></tr>)}</tbody></table>{!rows.length && <p className="data-state">Tidak ada hasil untuk filter ini.</p>}</div>}
      <Pagination collection={c} />
    </Card><CollectionEditor resource="events" collection={c} /></>;
}
