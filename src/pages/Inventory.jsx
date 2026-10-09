import DataState from '../components/DataState';
import { useState } from 'react';
import { Plus, PackageCheck, PackageOpen, Wrench, PackageX, Search } from 'lucide-react';
import { PageTitle, StatCard, Card, Badge } from '../components/UI';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import { useCollection } from '../lib/collections';
import { useResource } from '../lib/hooks';
export default function Inventory() {
  const c = useCollection('inventory'); const stats = useResource('/dashboard');
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('');
  const quantities = Object.fromEntries((stats.data?.inventory || []).map(row => [row.status,row.quantity]));
  const rows = c.rows.filter(row => row.name.toLowerCase().includes(query.toLowerCase()) && (!status || row.status === status));
  return <><PageTitle title="Inventory" subtitle="Manage sports assets and equipment" action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Add Asset</button>} /><div className="mini-stats">{[['Available',PackageCheck,'green'],['Borrowed',PackageOpen,'blue'],['Maintenance',Wrench,'orange'],['Lost',PackageX,'red']].map(([name,Icon,color]) => <StatCard key={name} icon={<Icon />} title={name} value={stats.data && !stats.loading && !stats.error ? quantities[name] || 0 : '—'} color={color} />)}</div><DataState loading={stats.loading} error={stats.error} retry={stats.reload} /><div className="inventory-bar"><div className="search local"><Search /><input aria-label="Search assets" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this page…" /></div><select aria-label="Asset status filter" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['Available','Borrowed','Maintenance','Lost'].map(value => <option key={value}>{value}</option>)}</select></div><CollectionFeedback collection={c} /><div className="asset-grid">{!c.loading && !c.error && rows.map(row => <Card className="asset" key={row.id}><div className="asset-img">{row.emoji || '📦'}</div><h3>{row.name}</h3><p>{row.category} · {row.location || '—'}</p><p>Jumlah: <b>{row.quantity}</b></p><div><Badge tone={row.status === 'Available' ? 'green' : 'orange'}>{row.status}</Badge><span>{row.condition}</span></div><RowActions collection={c} item={row} /></Card>)}</div>{!c.loading && !c.error && c.rows.length > 0 && !rows.length && <p className="data-state">Tidak ada hasil untuk filter ini.</p>}<Pagination collection={c} /><CollectionEditor resource="inventory" collection={c} /></>;
}
