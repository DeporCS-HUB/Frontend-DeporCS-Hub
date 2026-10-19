import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageTitle, Card, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { useCollection } from '../lib/collections';
import { Pagination } from '../components/CollectionTools';
import { departmentRole, roleLabel } from '../lib/roles';

export default function Team() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const result = useCollection('profiles', { q: query, departmentRole: role });
  const rows = result.rows;
  const profiles = rows;
  return <>
    <PageTitle title="Tim Departemen" subtitle="BPH mengelola kegiatan; Staff menjalankan tugas pelaksanaan." />
    <Card>
      <div className="table-tools">
        <div className="search local"><Search aria-hidden="true" /><input maxLength={120} aria-label="Cari anggota" placeholder="Cari nama…" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <select aria-label="Filter role" value={role} onChange={event => setRole(event.target.value)}>
          <option value="">Semua role</option><option value="bph">BPH</option><option value="staff">Staff</option>
        </select>
      </div>
      <DataState loading={result.loading} error={result.error} empty={profiles.length === 0} retry={result.reload} />
      {!result.loading && !result.error && <div className="member-list">{rows.map(member => <div key={member.id}>
        <span className="avatar" aria-hidden="true">{member.name.slice(0,2).toUpperCase()}</span>
        <p><b>{member.name}</b><small>{departmentRole(member) === 'bph' ? 'Pengelola departemen' : departmentRole(member) === 'staff' ? 'Pelaksana kegiatan' : 'Akses belum dikenali'}</small></p>
        <Badge tone={departmentRole(member) === 'bph' ? 'cyan' : 'green'}>{roleLabel(member)}</Badge>
      </div>)}</div>}
      {!result.loading && !result.error && profiles.length > 0 && !rows.length && <p className="data-state">Tidak ada anggota yang sesuai filter di halaman ini.</p>}
      <Pagination collection={result} />
    </Card>
  </>;
}
