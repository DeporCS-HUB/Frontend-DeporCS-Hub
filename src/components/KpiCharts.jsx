const groups = [
 { key: 'done', label: 'Selesai' }, { key: 'running', label: 'Berjalan' },
 { key: 'planned', label: 'Rencana' }, { key: 'unknown', label: 'Belum diisi' }, { key: 'cancelled', label: 'Batal' },
];
const group = status => status === 'Completed' ? 'done' : ['Ongoing','Active'].includes(status) ? 'running' : status === 'Planning' ? 'planned' : status === 'Cancelled' ? 'cancelled' : 'unknown';
const counts = programs => programs.reduce((result,p) => { result[group(p.status)]++; return result; }, Object.fromEntries(groups.map(g => [g.key,0])));
const label = name => name.match(/\(([A-Za-z0-9]+)\)$/)?.[1] || name.replace(/^UKOR /,'');
function Legend() { return <div className="kpi-chart-legend">{groups.map(g => <span key={g.key}><i className={`chart-${g.key}`} />{g.label}</span>)}</div>; }
function Segments({ values, total }) { return <div className="chart-track chart-stack" aria-hidden="true">{groups.map(g => values[g.key] > 0 && <span key={g.key} className={`chart-${g.key}`} style={{ width: `${values[g.key] / total * 100}%` }} title={`${g.label}: ${values[g.key]}`}>{values[g.key]}</span>)}</div>; }
export function ProgramChart({ programs }) {
 return <figure className="kpi-chart" aria-label="Grafik persentase progres kegiatan"><div className="percent-axis" aria-hidden="true">{[0,25,50,75,100].map(n => <span key={n}>{n}%</span>)}</div><div className="chart-rows program-chart-rows">{programs.map(p => <div className="chart-row" key={p.id} aria-label={`${p.name}: ${p.progress == null ? 'belum diisi' : `${p.progress}%`}`}><span className="chart-label" title={p.name}>{label(p.name)}</span><div className={`chart-track percent-track ${p.progress == null ? 'chart-missing' : ''}`} aria-hidden="true" title={p.progress == null ? 'Belum diisi' : `${p.progress}%`}><span className="chart-done" style={{width:`${p.progress ?? 0}%`}} /></div><b>{p.progress == null ? '—' : `${p.progress}%`}</b></div>)}</div>{!programs.length ? <p className="data-state">Belum ada kegiatan.</p> : <figcaption>— Belum diisi</figcaption>}</figure>;
}
export function StaffChart({ staff, programs, metric }) {
 const byId = new Map(programs.map(p => [p.id,p]));
 const maxUpdates = Math.max(1,...staff.map(s => s.updatesLast30Days || 0));
 return <figure className="kpi-chart" aria-label="Grafik kontribusi Staff">{metric === 'programs' ? <Legend /> : <div className="metric-caption">{metric === 'tasks' ? 'Selesai / tugas ditetapkan' : 'Jumlah pembaruan progres'}</div>}<div className="chart-rows staff-chart-rows" tabIndex={0} role="region" aria-label="Data grafik Staff">{staff.map(s => {
 const assigned = s.programs || []; const values = counts(assigned.map(p => byId.get(p.id) || {status:'Unspecified'}));
 const total = metric === 'programs' ? assigned.length : metric === 'tasks' ? s.assignedTasks : maxUpdates;
 const value = metric === 'tasks' ? s.completedTasks : s.updatesLast30Days;
 const summary = metric === 'programs' ? groups.filter(g => values[g.key]).map(g => `${values[g.key]} ${g.label.toLowerCase()}`).join(', ') || 'Belum ada PJ' : metric === 'tasks' ? total ? `${value} dari ${total} tugas selesai` : 'Belum ada tugas' : `${value || 0} pembaruan dalam 30 hari`;
 return <div className="chart-row" key={s.id} aria-label={`${s.name}: ${summary}`} title={summary}><span className="chart-label">{s.name}</span>{metric === 'programs' && total ? <Segments values={values} total={total} /> : <div className={`chart-track ${!total ? 'chart-missing' : ''}`} aria-hidden="true"><span className="chart-done" style={{width:`${total ? (value || 0) / total * 100 : 0}%`}} /></div>}<b>{metric === 'programs' ? total || '—' : metric === 'tasks' ? total ? `${value}/${total}` : '—' : value || 0}</b></div>;
 })}</div>{!staff.length && <p className="data-state">Belum ada data Staff.</p>}</figure>;
}
export function StatusChart({ programs }) {
 return <figure className="kpi-chart" aria-label="Grafik distribusi status kegiatan"><div className="status-chart-rows">{['Proker','UKOR'].map(kind => { const rows=programs.filter(p=>p.kind===kind);const values=counts(rows);return <div className="chart-row" key={kind} aria-label={`${kind}: ${groups.map(g=>`${values[g.key]} ${g.label.toLowerCase()}`).join(', ')}`}><span className="chart-label">{kind}</span>{rows.length ? <Segments values={values} total={rows.length} /> : <div className="chart-track chart-missing" />}<b>{rows.length}</b></div>; })}</div><Legend /></figure>;
}
