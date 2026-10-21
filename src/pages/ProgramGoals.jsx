import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, Badge } from '../components/UI';
import Editor from '../components/Editor';
import { CollectionFeedback, Pagination } from '../components/CollectionTools';
import { useCollection } from '../lib/collections';
import { api } from '../lib/api';
import { date } from '../lib/hooks';
import { goalResult } from '../lib/goals';

export default function ProgramGoals({ id }) {
 const c = useCollection(`programs/${id}/goals`, {}, 20);
 const [editor, setEditor] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 async function remove(item) {
  if (!window.confirm('Hapus indikator ini?')) return;
  setBusy(true); setError('');
  try { await api(`/programs/${id}/goals/${item.id}`, { method: 'DELETE' }); } catch (e) { setError(e.message); } finally { setBusy(false); }
 }
 return <Card className="program-goals"><div className="section-heading"><div><h2>Goals & KPI</h2><p>Target dan realisasi untuk periode yang dicatat.</p></div><button className="primary" onClick={() => setEditor({ metric_type: 'count' })}><Plus size={16} />Tambah indikator</button></div>
 {error && <p className="error" role="alert">{error}</p>}<CollectionFeedback collection={c} />
 {!c.loading && !c.error && <ul className="goal-list">{c.rows.map(item => { const result = goalResult(item); return <li key={item.id} className="goal-item"><div className="goal-heading"><h3>{item.title}</h3><Badge tone={result.unknown ? 'status-unspecified' : result.met ? 'status-done' : 'status-running'}>{result.unknown ? 'Belum ada data' : result.met ? 'Target tercapai' : 'Belum tercapai'}</Badge></div>
 <div className="goal-numbers"><span><small>Realisasi</small><b>{result.actualLabel}</b></span><span><small>Target</small><b>{result.targetLabel}</b></span></div>
 <div className={`goal-track ${result.unknown ? 'goal-unknown' : result.met ? 'goal-met' : ''}`} role="img" aria-label={result.unknown ? 'Realisasi belum diisi' : `${result.actualLabel}; target ${result.targetLabel}`}><span style={{ width: `${result.ratio}%` }} /></div>
 <p className="goal-period">Target: {item.target_period}{item.actual_value != null && <> · Realisasi: {item.measurement_period} · {date(item.measured_on)}</>}</p>
 {(item.evidence || item.source_ref) && <details><summary>Bukti & sumber</summary>{item.evidence && <p>{item.evidence}</p>}{item.source_ref && <small>{item.source_ref}</small>}</details>}
 <div className="actions"><button className="text-button" onClick={() => setEditor(item)} disabled={busy}>Edit indikator</button><button className="text-button danger-text" onClick={() => remove(item)} disabled={busy}>Hapus</button></div></li>; })}</ul>}
 <Pagination collection={c} />{editor && <Editor resource="goals" basePath={`/programs/${id}/goals`} item={editor} onClose={() => setEditor(null)} onSaved={() => setEditor(null)} />}</Card>;
}
