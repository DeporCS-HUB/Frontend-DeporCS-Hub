import { Plus, WalletCards, Landmark, HandCoins, TrendingUp } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { PageTitle, StatCard, Card, PanelTitle, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import { useCollection } from '../lib/collections';
import { useResource, money, date } from '../lib/hooks';
const FinanceChart = lazy(() => import('../components/Charts').then(module => ({ default: module.FinanceChart })));
export default function Finance() {
  const c = useCollection('finances'); const stats = useResource('/dashboard');
  const summary = stats.loading || stats.error ? null : stats.data?.summary;
  return <><PageTitle title="Keuangan" subtitle="Rekap berdasarkan transaksi yang telah disetujui." action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Tambah transaksi</button>} /><div className="mini-stats">{[['Total anggaran','budget',WalletCards],['Pengeluaran','expense',Landmark],['Sisa anggaran','remaining',HandCoins],['Pemasukan','income',TrendingUp]].map(([label,key,Icon]) => <StatCard key={key} icon={<Icon />} title={label} value={summary ? money(summary[key]) : '—'} />)}</div><Card><PanelTitle title={`Pemasukan & pengeluaran · ${new Date().getFullYear()}`} /><DataState loading={stats.loading} error={stats.error} retry={stats.reload} />{stats.data && !stats.loading && !stats.error && <Suspense fallback={<div className="chart"><DataState loading /></div>}><FinanceChart monthly={stats.data.monthly} /></Suspense>}</Card><Card className="collection-card"><PanelTitle title="Transaksi" /><CollectionFeedback collection={c} />{!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table><thead><tr>{['Deskripsi','Tanggal','Kategori','Jenis','Nominal','Status','Tindakan'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{c.rows.map(row => <tr key={row.id}><td><b>{row.description}</b></td><td>{date(row.transaction_date)}</td><td>{row.category}</td><td>{row.type}</td><td>{money(row.amount)}</td><td><Badge tone={row.status === 'approved' ? 'green' : 'orange'}>{row.status}</Badge></td><td><RowActions collection={c} item={row} /></td></tr>)}</tbody></table></div>}<Pagination collection={c} /></Card><CollectionEditor resource="finances" collection={c} /></>;
}
