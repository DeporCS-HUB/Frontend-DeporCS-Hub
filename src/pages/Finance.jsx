import { Plus, WalletCards, Landmark, HandCoins, TrendingUp } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { PageTitle, StatCard, Card, PanelTitle, Badge } from '../components/UI';
import DataState from '../components/DataState';
import DetailsDialog from '../components/DetailsDialog';
import { CollectionFeedback, CollectionEditor, Pagination, RowActions } from '../components/CollectionTools';
import { useCollection } from '../lib/collections';
import { useResource, money, date } from '../lib/hooks';
import { financeKinds, reimbursementStatuses, approvalStatuses } from '../lib/finance';
const FinanceChart = lazy(() => import('../components/Charts').then(module => ({ default: module.FinanceChart })));
export default function Finance() {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [type, setType] = useState('');
  const [reimbursement, setReimbursement] = useState(''); const [expanded, setExpanded] = useState(null);
  const c = useCollection('finances', { q: query, status, type, reimbursement_status: reimbursement }); const stats = useResource('/dashboard');
  const summary = stats.loading || stats.error ? null : stats.data?.summary;
  return <>
    <PageTitle title="Keuangan" subtitle="Transaksi dan pengajuan dana. Realisasi hanya menghitung transaksi yang disetujui." action={c.manages && <button className="primary" onClick={() => c.setEditor({})}><Plus />Tambah transaksi</button>} />
    <div className="mini-stats">{[['Total anggaran','budget',WalletCards],['Pengeluaran disetujui','expense',Landmark],['Sisa anggaran','remaining',HandCoins],['Pemasukan disetujui','income',TrendingUp]].map(([label,key,Icon]) => <StatCard key={key} icon={<Icon />} title={label} value={summary ? money(summary[key]) : '—'} />)}</div>
    <Card><PanelTitle title={'Pemasukan & pengeluaran · ' + new Date().getFullYear()} /><p className="muted">Grafik bulanan hanya mencakup transaksi bertanggal.</p><DataState loading={stats.loading} error={stats.error} retry={stats.reload} />{stats.data && !stats.loading && !stats.error && <Suspense fallback={<div className="chart"><DataState loading /></div>}><FinanceChart monthly={stats.data.monthly} /></Suspense>}</Card>
    <Card className="collection-card"><PanelTitle title="Transaksi & pengajuan" />
      <div className="table-tools">
        <input maxLength={120} aria-label="Cari transaksi" placeholder="Cari transaksi…" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="Filter jenis transaksi" value={type} onChange={e => setType(e.target.value)}><option value="">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select>
        <select aria-label="Filter status transaksi" value={status} onChange={e => setStatus(e.target.value)}><option value="">Semua persetujuan</option>{Object.entries(approvalStatuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="Filter status reimburse" value={reimbursement} onChange={e => setReimbursement(e.target.value)}><option value="">Semua reimburse</option>{Object.entries(reimbursementStatuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
      </div>
      <CollectionFeedback collection={c} />
      {!c.loading && !c.error && c.rows.length > 0 && <div className="table-wrap"><table><thead><tr>{['Deskripsi','Tanggal','Kategori','Jenis catatan','Nominal','Persetujuan','Reimburse','Tindakan'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{c.rows.map(row => <tr key={row.id}>
        <td><b>{row.description}</b></td><td>{row.transaction_date ? date(row.transaction_date) : 'Belum diketahui'}</td><td>{row.category}</td><td>{financeKinds[row.record_kind || 'transaction']} · {row.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</td><td>{money(row.amount)}</td>
        <td><Badge tone={row.status === 'approved' ? 'green' : 'orange'}>{approvalStatuses[row.status]}</Badge></td>
        <td><Badge tone={row.reimbursement_status === 'paid' ? 'green' : 'orange'}>{reimbursementStatuses[row.reimbursement_status || 'unknown']}</Badge></td>
        <td><button className="text-button" onClick={() => setExpanded(row)} aria-label={'Detail ' + row.description}>Detail</button><RowActions collection={c} item={row} /></td>
      </tr>)}</tbody></table></div>}
      <Pagination collection={c} />
    </Card>
    <CollectionEditor resource="finances" collection={c} />
    {expanded && <DetailsDialog item={{ name: expanded.description, description: [
      'Jenis catatan: ' + financeKinds[expanded.record_kind || 'transaction'],
      'Nominal: ' + money(expanded.amount),
      'Tanggal transaksi: ' + (expanded.transaction_date ? date(expanded.transaction_date) : 'Belum diketahui'),
      'Persetujuan: ' + approvalStatuses[expanded.status],
      'Reimburse: ' + reimbursementStatuses[expanded.reimbursement_status || 'unknown'],
      expanded.notes, expanded.source_ref && 'Sumber bukti: ' + expanded.source_ref,
    ].filter(Boolean).join('\n\n') }} onClose={() => setExpanded(null)} />}
  </>;
}
