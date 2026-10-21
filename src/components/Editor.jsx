import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/hooks';
import { canManage } from '../lib/roles';
import { programStatuses, programStatusLabel } from '../lib/programs';
const resourceLabels = { programs: 'program', tasks: 'tugas', finances: 'transaksi', inventory: 'barang', events: 'kegiatan', programProgress: 'progres', milestones: 'agenda', goals: 'indikator' };
const today = () => new Date().toISOString().slice(0, 10);
const schemas = {
  events: [['name','Nama','text',true],['description','Deskripsi','textarea'],['program_id','Program','programs'],['venue','Venue','text',true],['start_date','Mulai','date',true],['end_date','Selesai','date',true],['status','Status',['Planning','Confirmed','Completed','Cancelled'],true],['permit_status','Status izin',['Not required','Pending','Approved','Rejected'],true]],
  programs: [['name','Nama','text',true],['kind','Jenis kegiatan',['Proker','UKOR'],true],['description','Deskripsi','textarea'],['assignee_ids','Akun PJ','profiles_multiple',true],['start_date','Mulai','date'],['end_date','Selesai','date'],['status','Status',programStatuses,true],['progress','Progress (%)','number'],['progress_notes','Catatan progres','textarea'],['next_milestone','Agenda berikutnya','text'],['milestone_date','Tanggal agenda','date'],['budget','Budget (Rp)','number']],
  milestones: [['title','Judul agenda','text',true],['due_date','Tanggal agenda','date'],['start_time','Mulai (WIB)','time'],['end_time','Selesai (WIB)','time'],['venue','Lokasi','text'],['status','Status agenda',['Planned','Done','Cancelled'],true],['schedule_status','Kepastian jadwal',['Tentative','Confirmed'],true],['description','Catatan agenda','textarea'],['source_ref','Sumber','text']],
  goals: [['title','Indikator','text',true],['metric_type','Jenis ukuran',['count','percent','boolean'],true],['target_value','Nilai target','number',true],['unit','Satuan','text',true],['target_period','Periode target','text',true],['actual_value','Nilai realisasi','number'],['measurement_period','Periode realisasi','text'],['measured_on','Tanggal pengukuran','date'],['evidence','Bukti realisasi','textarea'],['source_ref','Sumber target','text']],
  programProgress: [['status','Status',programStatuses,true],['progress','Progress (%)','number'],['progress_notes','Catatan progres','textarea']],
  tasks: [['title','Judul','text',true],['description','Deskripsi','textarea'],['program_id','Program','programs',true],['assignee_id','Penanggung jawab','profiles'],['status','Status',['Backlog','To Do','In Progress','Review','Done'],true],['priority','Prioritas',['Low','Medium','High'],true],['due_date','Deadline','date']],
  finances: [['description','Deskripsi','text',true],['program_id','Program','programs'],['type','Jenis',['expense','income'],true],['amount','Nominal (Rp)','number',true],['category','Kategori','text',true],['transaction_date','Tanggal','date',true],['status','Status',['pending','approved','rejected'],true]],
  inventory: [['name','Nama','text',true],['category','Kategori','text',true],['quantity','Jumlah','number',true],['status','Status',['Available','Borrowed','Maintenance','Lost'],true],['condition','Kondisi',['Baik','Perawatan','Rusak'],true],['location','Lokasi','text']],
};
const defaults = { events: { start_date: today(), end_date: today(), status: 'Planning', permit_status: 'Pending' }, programs: { kind: 'Proker', status: 'Planning' }, programProgress: { status: 'Planning' }, tasks: { status: 'To Do', priority: 'Medium' }, finances: { transaction_date: today(), status: 'pending' }, inventory: { quantity: 1, condition: 'Baik' } };
export default function Editor({ resource, item, onClose, onSaved, programId, programAssignees, basePath }) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState({});
  const [choiceError, setChoiceError] = useState('');
  const dialog = useRef(null);
  const [selectedPjs, setSelectedPjs] = useState(item?.assignee_ids || []);
  const [selectedAssignee, setSelectedAssignee] = useState(item?.assignee_id || '');
  const [selectedProgram, setSelectedProgram] = useState(programId || item?.program_id || '');
  const eligibleIds = programAssignees || choices.programs?.find(p => p.id === selectedProgram)?.assignee_ids;
  const fields = schemas[resource].filter(([name]) => (name !== 'assignee_id' || canManage(user)) && !(name === 'program_id' && programId));
  useEffect(() => {
    const previous = document.activeElement; dialog.current?.focus();
    const sources = [...new Set(schemas[resource].filter(([name]) => name !== 'assignee_id' || canManage(user)).map(field => field[2] === 'profiles_multiple' ? 'profiles' : field[2]).filter(type => type === 'programs' || type === 'profiles'))];
    let active = true;
    (sources.length ? api('/directory') : Promise.resolve({ data: {} }))
      .then(({ data }) => { if (active) setChoices(data); })
      .catch(failure => { if (active) setChoiceError(failure.message); });
    return () => { active = false; if (previous?.isConnected) previous.focus(); };
  }, [resource, user]);
  function changeProgram(id) {
    setSelectedProgram(id);
    const assignee = choices.profiles?.find(p => p.id === selectedAssignee);
    const next = choices.programs?.find(p => p.id === id);
    if (selectedAssignee && !canManage(assignee) && !next?.assignee_ids?.includes(selectedAssignee)) setSelectedAssignee('');
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fields.map(([name,,type]) => {
      if (type === 'profiles_multiple') return [name, form.getAll(name)];
      const value = form.get(name);
      return [name, type === 'number' ? (value === '' && !fields.find(field => field[0] === name)[3] ? null : Number(value)) : value === '' && !['progress_notes','next_milestone'].includes(name) ? null : value];
    }));
    if (['programs','programProgress'].includes(resource) && payload.status === 'Completed') payload.progress = 100;
    if (resource === 'programs' && payload.assignee_ids.length) payload.pic = (choices.profiles || []).filter(profile => payload.assignee_ids.includes(profile.id)).map(profile => profile.name).join(', ');
    if (resource === 'tasks' && programId) payload.program_id = programId;
    if (resource === 'tasks' && !payload.program_id) { setError('Pilih Proker/UKOR untuk tugas pelaksanaan ini.'); setBusy(false); return; }
    if (resource === 'tasks' && !canManage(user)) payload.assignee_id = item?.assignee_id || user.id;
    if (resource === 'goals' && payload.actual_value != null && (!payload.measurement_period?.trim() || !payload.measured_on || !payload.evidence?.trim())) { setError('Isi periode, tanggal pengukuran, dan bukti untuk realisasi.'); setBusy(false); return; }
    // Retain stored legacy icon data when editing; decorative emojis are no longer rendered.
    if (resource === 'inventory') payload.emoji = item?.emoji ?? null;
    try { await api(resource === 'programProgress' ? `/programs/${item.id}/progress` : `${basePath || `/${resource}`}${item?.id ? `/${item.id}` : ''}`, { method: item?.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); onSaved(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><section className="card editor" role="dialog" aria-modal="true" aria-labelledby="editor-title" tabIndex={-1} ref={dialog} onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose();
    if (event.key === 'Tab') {
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input,select,textarea')];
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    } }}><h2 id="editor-title">{item?.id ? 'Edit' : 'Tambah'} {resourceLabels[resource]}</h2><form onSubmit={submit}>{resource === 'tasks' && <p className="task-form-context">{programId ? `Tugas pelaksanaan · ${choices.programs?.find(p => p.id === programId)?.name || 'Program ini'}` : 'Satu tugas kecil untuk pelaksanaan Proker/UKOR. Pilih program induknya.'}</p>}<div className="form-grid">{fields.map(([name,label,type,required]) => {
    let value = item?.[name] ?? defaults[resource]?.[name] ?? (Array.isArray(type) ? type[0] : '');
    const programStatus = name === 'status' && ['programs','programProgress'].includes(resource);
    if (programStatus && value === 'Active') value = 'Ongoing';
    const options = programStatus && !programStatuses.includes(value) ? [value, ...type] : type;
    const linked = type === 'profiles' || type === 'programs';
    if (type === 'time' && value) value = value.slice(0, 5);
    if (type === 'profiles_multiple') return <label key={name}>{label}<select multiple required={required} size={5} aria-label={label} name={name} value={selectedPjs} onChange={event => setSelectedPjs([...event.target.selectedOptions].map(option => option.value))}>{(choices.profiles || []).map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><small>Ctrl/Cmd + klik untuk memilih beberapa PJ.</small></label>;
    return <label key={name}>{label}{Array.isArray(type) || linked ? <select aria-label={label} name={name} required={required} defaultValue={linked ? undefined : value} value={linked ? name === 'program_id' ? selectedProgram : selectedAssignee : undefined} onChange={linked ? event => { if (name === 'program_id') { changeProgram(event.target.value); } else setSelectedAssignee(event.target.value); } : undefined}>{linked && <option value="">Tidak dipilih</option>}{(linked ? (choices[type] || []).filter(option => type !== 'profiles' || !eligibleIds || canManage(option) || eligibleIds.includes(option.id)) : options).map(option => <option key={linked ? option.id : option} value={linked ? option.id : option} hidden={programStatus && !programStatuses.includes(option)}>{linked ? `${type === 'programs' && option.kind ? `${option.kind} · ` : ''}${option.name}` : programStatus ? programStatusLabel(option) : option}</option>)}</select> : type === 'textarea' ? <textarea aria-label={label} name={name} defaultValue={value} maxLength={2000} /> : <input aria-label={label} name={name} type={type} defaultValue={value} required={required} min={type === 'number' ? (name === 'amount' ? 0.01 : 0) : undefined} max={name === 'progress' ? 100 : name === 'quantity' ? 1000000 : undefined} step={['amount','budget'].includes(name) ? '0.01' : type === 'number' ? '1' : undefined} maxLength={160} />}</label>;
  })}</div>{choiceError && <p className="error" role="alert">Pilihan relasi gagal dimuat: {choiceError}</p>}{error && <p className="error" role="alert">{error}</p>}<div className="actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Batal</button><button className="primary" disabled={busy || Boolean(choiceError)}>{busy ? 'Menyimpan…' : 'Simpan'}</button></div></form></section></div>;
}
