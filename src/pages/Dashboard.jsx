import { Link } from 'react-router-dom';
import { Card, PanelTitle, Badge, Progress } from '../components/UI';
import DataState from '../components/DataState';
import { useState } from 'react';
import { useAuth, useResource, date } from '../lib/hooks';
import { canManage, roleLabel } from '../lib/roles';
import { programStatusLabel } from '../lib/programs';
const updated = value => value ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Belum ada pembaruan';
export default function Dashboard() {
 const result = useResource('/dashboard'); const { user } = useAuth(); const data = result.data;
 const [kind, setKind] = useState('Proker');
 const manages = canManage(user); const now = new Date();
 const programs = (data?.programFocus || []).filter(row => row.kind === kind);
 const staff = data?.staffPerformance || [];
 return <><header className="dashboard-heading"><div><p className="eyebrow">DEPARTEMEN OLAHRAGA</p><h1>Dashboard</h1><p>Selamat datang, {user.name}</p></div><div className="dashboard-meta"><Badge>{roleLabel(user)}</Badge><time>{now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' })}</time></div></header>
 <DataState loading={result.loading} error={result.error} retry={result.reload} />{data && !result.loading && !result.error && <>
 <div className="work-overview"><span><b>{data.overview?.proker ?? '—'}</b> Proker</span><span><b>{data.overview?.ukor ?? '—'}</b> UKOR</span><Link to="/tasks"><b>{data.overview?.openTasks ?? data.summary?.pendingTasks ?? 0}</b> tugas terbuka</Link>{data.overview?.overdueTasks > 0 && <Link to="/tasks"><b>{data.overview.overdueTasks}</b> melewati tenggat</Link>}</div>
 <div className="workspace-grid"><Card className="program-focus"><PanelTitle title="Progres Proker & UKOR" action={<Link to="/programs">Lihat semua</Link>} />
 <div className="kind-tabs" role="group" aria-label="Jenis progres">{['Proker','UKOR'].map(value => <button key={value} className="secondary" aria-pressed={kind === value} onClick={() => setKind(value)}>{value}</button>)}</div>
 <div className="program-focus-list">{programs.map(row => <article key={row.id}><div className="program-focus-top"><div><h3>{row.name}</h3><p>{row.pic}</p></div><Badge>{programStatusLabel(row.status)}</Badge></div><p>{row.progress_notes || 'Catatan progres belum diisi.'}</p>{row.progress == null ? <small>Persentase belum diisi</small> : <div className="progress-cell"><Progress value={row.progress} /><span>{row.progress}%</span></div>}{row.next_milestone && <div className="milestone-note">{row.next_milestone} · {row.milestone_date ? date(row.milestone_date) : 'Tanggal menyusul'}</div>}</article>)}</div>{!programs.length && <p className="data-state">Belum ada {kind} yang tercatat.</p>}</Card>
 <div className="workspace-side"><Card><PanelTitle title="Agenda terdekat" /><div className="agenda-list">{(data.upcomingMilestones || []).map(row => <article key={row.id}><time>{date(row.milestone_date)}</time><h3>{row.next_milestone}</h3><p>{row.name}</p><small>{row.pic}</small></article>)}</div>{!data.upcomingMilestones?.length && <p className="data-state">Belum ada tanggal agenda yang ditetapkan.</p>}</Card>
 <Card><PanelTitle title="Tindak lanjut" action={<Link to="/tasks">Buka tugas</Link>} /><div className="follow-up-list">{(data.attentionTasks || []).map(row => <article key={row.id}><h3>{row.title}</h3><small>{row.assignee || 'PJ tugas belum ditetapkan'}{row.due_date ? ` · ${date(row.due_date)}` : ''}</small><Badge>{row.status}</Badge></article>)}</div>{!data.attentionTasks?.length && <p className="data-state">Tidak ada tugas terbuka.</p>}</Card></div></div>
 <Card className="staff-performance"><PanelTitle title="Performa Staff" action={<Link to="/team">Lihat tim</Link>} /><p className="section-note">Ringkasan tanggung jawab, tugas, dan pembaruan progres yang tercatat. Tugas yang belum ditetapkan ke akun belum dihitung per Staff.</p>
 <div className="table-wrap"><table><thead><tr><th>Staff</th><th>Tanggung jawab</th><th>Tugas selesai</th><th>Dalam review</th><th>Lewat tenggat</th><th>Update 30 hari</th><th>Pembaruan terakhir</th></tr></thead><tbody>{staff.map(row => <tr key={row.id}><td><b>{row.name}</b></td><td className="responsibilities">{row.programs.length ? row.programs.map(program => <span key={program.id}><Badge>{program.kind}</Badge> {program.name}</span>) : <small>Belum ada pembagian PJ</small>}</td><td>{row.assignedTasks ? <><b>{row.completedTasks} / {row.assignedTasks}</b><small>{Math.round(row.completedTasks / row.assignedTasks * 100)}% selesai</small></> : <small>Belum ada tugas</small>}</td><td>{row.reviewTasks}</td><td>{row.overdueTasks}</td><td>{row.updatesLast30Days}</td><td><small>{updated(row.lastUpdate)}</small></td></tr>)}</tbody></table></div>{!staff.length && <p className="data-state">Belum ada data Staff.</p>}</Card>
 <div className="workspace-links"><Link to="/tasks">{manages ? 'Kelola tugas' : 'Tugas pelaksanaan'}</Link>{manages && <Link to="/programs">Kelola program</Link>}<Link to="/finance">Ringkasan keuangan</Link><Link to="/inventory">Buka inventaris</Link><Link to="/events">Lihat kegiatan</Link></div>
 </>}</>;
}
