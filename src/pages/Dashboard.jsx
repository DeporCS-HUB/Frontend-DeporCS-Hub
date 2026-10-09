import { Link } from 'react-router-dom';
import { Trophy, ClipboardList, WalletCards, PackageCheck } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Card, StatCard, PanelTitle, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { useAuth, useResource, money, date } from '../lib/hooks';
import { canManage, roleLabel } from '../lib/roles';

const DashboardFinanceChart = lazy(() => import('../components/Charts').then(module => ({ default: module.DashboardFinanceChart })));
const InventoryChart = lazy(() => import('../components/Charts').then(module => ({ default: module.InventoryChart })));
export default function Dashboard() {
  const result = useResource('/dashboard');
  const { user } = useAuth();
  const data = result.data;
  const manages = canManage(user);
  const now = new Date();
  return <>
    <header className="dashboard-heading">
      <div><p className="eyebrow">DEPARTEMEN OLAHRAGA</p><h1>Dashboard</h1><p>Selamat datang, {user.name}</p></div>
      <div className="dashboard-meta"><Badge>{roleLabel(user)}</Badge><time>{now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' })}</time></div>
    </header>
    <DataState loading={result.loading} error={result.error} retry={result.reload} />
    {data && !result.loading && !result.error && <>
      <div className="stats-grid">
        <StatCard icon={<Trophy />} title="Program aktif" value={data.summary.activePrograms} />
        <StatCard icon={<ClipboardList />} title="Tugas belum selesai" value={data.summary.pendingTasks} />
        <StatCard icon={<WalletCards />} title="Penggunaan anggaran" value={`${data.summary.budgetUtilization}%`} />
        <StatCard icon={<PackageCheck />} title="Jumlah aset" value={data.summary.totalAssets} />
        <StatCard icon={<WalletCards />} title="Sisa anggaran" value={money(data.summary.remaining)} />
      </div>
      <div className="dashboard-grid">
        <Card className="analytics"><PanelTitle title="Pemasukan & pengeluaran disetujui" />
          <Suspense fallback={<div className="chart"><DataState loading /></div>}><DashboardFinanceChart monthly={data.monthly} /></Suspense>
        </Card>
        <Card><PanelTitle title="Program saat ini & mendatang" /><div className="timeline">
          {data.upcomingPrograms.map(row => <div key={row.id}><i /><span><b>{row.name}</b><small>{row.status}</small></span><time>{date(row.start_date)}</time></div>)}
        </div>{!data.upcomingPrograms.length && <p className="data-state">Belum ada program mendatang.</p>}<Link to="/programs">Lihat program</Link></Card>
        <Card className="inventory-summary"><PanelTitle title="Ringkasan inventaris" />
          {data.inventory.length ? <><Suspense fallback={<DataState loading />}><InventoryChart inventory={data.inventory} /></Suspense><ul>{data.inventory.map(row => <li key={row.status}>{row.status}: <b>{row.quantity}</b></li>)}</ul></> : <p className="data-state">Belum ada aset.</p>}
        </Card>
        <Card className="quick-panel"><PanelTitle title="Akses cepat" /><div className="quick">
          <Link to="/tasks">{manages ? 'Kelola tugas' : 'Tugas pelaksanaan'}</Link>
          {manages && <Link to="/programs">Kelola program</Link>}
          {manages && <Link to="/finance">Kelola keuangan</Link>}
          {manages && <Link to="/inventory">Kelola aset</Link>}
          {manages && <Link to="/events">Kelola kegiatan</Link>}
          <Link to="/team">Tim departemen</Link>
        </div></Card>
      </div>
    </>}
  </>;
}
