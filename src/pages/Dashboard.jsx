import { Link } from 'react-router-dom';
import { Trophy, ClipboardList, WalletCards, PackageCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, StatCard, PanelTitle, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { useAuth, useResource, money, date } from '../lib/hooks';
import { canManage, roleLabel } from '../lib/roles';

const colors = ['#16b7aa','#f2ae31','#2478d4','#ef5d69'];
export default function Dashboard() {
  const result = useResource('/dashboard');
  const { user } = useAuth();
  const data = result.data;
  const manages = canManage(user);
  const now = new Date();
  return <>
    <div className="hero">
      <div className="hero-copy">
        <Badge>{roleLabel(user)}</Badge>
        <p>Selamat datang, {user.name}</p>
        <h1>Ruang kerja Departemen Olahraga</h1>
        <span>{manages ? 'Pantau program, pembagian tugas, keuangan, dan aset departemen.' : 'Ikuti perkembangan program dan selesaikan tugas pelaksanaanmu.'}</span>
      </div>
      <div className="hero-time">
        <small>{now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full' })}</small>
        <b>{now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</b><span>WIB</span>
      </div>
    </div>
    <DataState loading={result.loading} error={result.error} retry={result.reload} />
    {data && !result.loading && !result.error && <>
      <div className="stats-grid">
        <StatCard icon={<Trophy />} title="Program aktif" value={data.summary.activePrograms} />
        <StatCard icon={<ClipboardList />} title="Tugas belum selesai" value={data.summary.pendingTasks} color="orange" />
        <StatCard icon={<WalletCards />} title="Penggunaan anggaran" value={`${data.summary.budgetUtilization}%`} color="purple" />
        <StatCard icon={<PackageCheck />} title="Jumlah aset" value={data.summary.totalAssets} color="green" />
        <StatCard icon={<WalletCards />} title="Sisa anggaran" value={money(data.summary.remaining)} />
      </div>
      <div className="dashboard-grid">
        <Card className="analytics"><PanelTitle title="Pemasukan & pengeluaran disetujui" />
          <div className="chart"><ResponsiveContainer><LineChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={money} />
            <Line type="monotone" name="Pemasukan" dataKey="income" stroke="#1678dc" strokeWidth={3} />
            <Line type="monotone" name="Pengeluaran" dataKey="expense" stroke="#16b7aa" strokeWidth={3} />
          </LineChart></ResponsiveContainer></div>
        </Card>
        <Card><PanelTitle title="Program saat ini & mendatang" /><div className="timeline">
          {data.upcomingPrograms.map(row => <div key={row.id}><i /><span><b>{row.name}</b><small>{row.status}</small></span><time>{date(row.start_date)}</time></div>)}
        </div>{!data.upcomingPrograms.length && <p className="data-state">Belum ada program mendatang.</p>}<Link to="/programs">Lihat program</Link></Card>
        <Card><PanelTitle title="Ringkasan inventaris" />
          {data.inventory.length ? <><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={data.inventory} dataKey="quantity" nameKey="status" innerRadius={42} outerRadius={65}>
            {data.inventory.map((row,index) => <Cell key={row.status} fill={colors[index % colors.length]} />)}
          </Pie><Tooltip /></PieChart></ResponsiveContainer><ul>{data.inventory.map(row => <li key={row.status}>{row.status}: <b>{row.quantity}</b></li>)}</ul></> : <p className="data-state">Belum ada aset.</p>}
        </Card>
        <Card><PanelTitle title="Akses cepat" /><div className="quick">
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
