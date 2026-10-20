import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { Card, PanelTitle, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { useAuth, useResource } from '../lib/hooks';
import { canManage, roleLabel } from '../lib/roles';
import { ProgramChart, StaffChart, StatusChart } from '../components/KpiCharts';
export default function Dashboard() {
 const result = useResource('/dashboard/overview'); const { user } = useAuth(); const data = result.data;
 const [kind, setKind] = useState('Proker'); const [metric, setMetric] = useState('programs');
 const programs = data?.programFocus || []; const summary = data?.summary || {};
 const total = summary.totalPrograms ?? programs.length;
 const recorded = summary.recordedPrograms ?? (total === programs.length ? programs.filter(p => p.progress != null).length : '—');
 const tasks = (summary.completedTasks || 0) + (data?.overview?.openTasks ?? summary.pendingTasks ?? 0);
 return <><header className="dashboard-heading"><div><h1>Dashboard</h1><p>Selamat datang, {user.name}</p></div><div className="dashboard-meta"><Badge>{roleLabel(user)}</Badge><time><CalendarDays aria-hidden="true" size={14} />{new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' })}</time></div></header>
 <DataState loading={result.loading} error={result.error} retry={result.reload} />{data && !result.loading && !result.error && <>
 <div className="dashboard-overview"><div className="kpi-grid">
 <Card className="kpi kpi-featured"><Link className="kpi-open" to="/programs" aria-label="Buka program"><ArrowUpRight /></Link><small>Kegiatan selesai</small><strong>{summary.completedPrograms ?? programs.filter(p => p.status === 'Completed').length}<span> / {summary.totalPrograms ?? programs.length}</span></strong></Card>
 <Card className="kpi"><Link className="kpi-open" to="/programs" aria-label="Buka progres program"><ArrowUpRight /></Link><small>Progres tercatat</small><strong>{recorded}<span> / {total}</span></strong></Card>
 <Card className="kpi"><Link className="kpi-open" to="/tasks" aria-label="Buka tugas"><ArrowUpRight /></Link><small>Tugas selesai</small><strong>{summary.completedTasks ?? 0}<span> / {tasks}</span></strong></Card>
 <Card className="kpi"><Link className="kpi-open" to="/tasks" aria-label="Buka papan tenggat"><ArrowUpRight /></Link><small>Lewat tenggat</small><strong>{data.overview?.overdueTasks ?? 0}</strong></Card>
 </div>
 <Card className="program-chart-card"><PanelTitle title="Progres Proker & UKOR" action={<Link to="/programs">{canManage(user) ? 'Kelola' : 'Lihat'}</Link>} /><div className="kind-tabs" role="group" aria-label="Jenis progres">{['Proker','UKOR'].map(value => <button key={value} className="secondary" aria-pressed={kind === value} onClick={() => setKind(value)}>{value}</button>)}</div><ProgramChart programs={programs.filter(p => p.kind === kind)} />{total > programs.length && <p className="chart-coverage">Pratinjau {programs.length} dari {total} kegiatan · <Link to="/programs">Lihat semua</Link></p>}</Card>
 </div><div className="dashboard-details"><Card className="staff-chart-card"><PanelTitle title="Performa Staff" action={<select aria-label="Metrik Staff" value={metric} onChange={e => setMetric(e.target.value)}><option value="programs">Status kegiatan</option><option value="tasks">Tugas selesai</option><option value="updates">Update 30 hari</option></select>} /><StaffChart staff={data.staffPerformance || []} programs={programs} metric={metric} /></Card>
 <Card className="status-chart-card"><PanelTitle title="Status kegiatan" action={<Link to="/tasks">Buka tugas</Link>} /><StatusChart programs={programs} statusCounts={data.programStatusCounts} total={total} /></Card></div>
 </>}</>;
}
