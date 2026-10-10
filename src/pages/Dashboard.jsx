import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, PanelTitle, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { useAuth, useResource } from '../lib/hooks';
import { canManage, roleLabel } from '../lib/roles';
import { ProgramChart, StaffChart, StatusChart } from '../components/KpiCharts';
export default function Dashboard() {
 const result = useResource('/dashboard'); const { user } = useAuth(); const data = result.data;
 const [kind, setKind] = useState('Proker'); const [metric, setMetric] = useState('programs');
 const programs = data?.programFocus || []; const summary = data?.summary || {};
 const recorded = programs.filter(p => p.progress != null).length;
 const tasks = (summary.completedTasks || 0) + (data?.overview?.openTasks ?? summary.pendingTasks ?? 0);
 return <><header className="dashboard-heading"><div><p className="eyebrow">DEPARTEMEN OLAHRAGA</p><h1>Dashboard</h1><p>Selamat datang, {user.name}</p></div><div className="dashboard-meta"><Badge>{roleLabel(user)}</Badge><time>{new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' })}</time></div></header>
 <DataState loading={result.loading} error={result.error} retry={result.reload} />{data && !result.loading && !result.error && <>
 <div className="kpi-grid">
 <Card className="kpi"><small>Kegiatan selesai</small><strong>{summary.completedPrograms ?? programs.filter(p => p.status === 'Completed').length}<span> / {summary.totalPrograms ?? programs.length}</span></strong></Card>
 <Card className="kpi"><small>Progres tercatat</small><strong>{recorded}<span> / {programs.length}</span></strong></Card>
 <Card className="kpi"><small>Tugas selesai</small><strong>{summary.completedTasks ?? 0}<span> / {tasks}</span></strong></Card>
 <Card className="kpi"><small>Lewat tenggat</small><strong>{data.overview?.overdueTasks ?? 0}</strong></Card>
 </div>
 <div className="kpi-chart-grid">
 <Card><PanelTitle title="Progres Proker & UKOR" action={<Link to="/programs">{canManage(user) ? 'Kelola' : 'Lihat'}</Link>} /><div className="kind-tabs" role="group" aria-label="Jenis progres">{['Proker','UKOR'].map(value => <button key={value} className="secondary" aria-pressed={kind === value} onClick={() => setKind(value)}>{value}</button>)}</div><ProgramChart programs={programs.filter(p => p.kind === kind)} /></Card>
 <Card><PanelTitle title="Performa Staff" action={<select aria-label="Metrik Staff" value={metric} onChange={e => setMetric(e.target.value)}><option value="programs">Status kegiatan</option><option value="tasks">Tugas selesai</option><option value="updates">Update 30 hari</option></select>} /><StaffChart staff={data.staffPerformance || []} programs={programs} metric={metric} /></Card>
 </div>
 <Card className="status-chart-card"><PanelTitle title="Status kegiatan" action={<Link to="/tasks">Buka tugas</Link>} /><StatusChart programs={programs} /></Card>
 </>}</>;
}
