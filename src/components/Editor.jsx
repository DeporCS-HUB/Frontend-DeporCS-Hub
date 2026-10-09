import { useEffect, useRef, useState } from 'react';
import { api, listAll } from '../lib/api';
import { useAuth } from '../lib/hooks';
import { canManage } from '../lib/roles';
const resourceLabels = { programs: 'program', tasks: 'tugas', finances: 'transaksi', inventory: 'barang', events: 'kegiatan' };
const today = () => new Date().toISOString().slice(0, 10);
const schemas = {
  events: [['name','Nama','text',true],['description','Deskripsi','textarea'],['program_id','Program','programs'],['venue','Venue','text',true],['start_date','Mulai','date',true],['end_date','Selesai','date',true],['status','Status',['Planning','Confirmed','Completed','Cancelled'],true],['permit_status','Status izin',['Not required','Pending','Approved','Rejected'],true]],
  programs: [['name','Nama','text',true],['description','Deskripsi','textarea'],['pic','PIC','text',true],['pic_id','Akun PIC','profiles'],['start_date','Mulai','date',true],['end_date','Selesai','date',true],['status','Status',['Planning','Ongoing','Active','Completed','Cancelled'],true],['progress','Progress (%)','number',true],['budget','Budget (Rp)','number',true]],
  tasks: [['title','Judul','text',true],['description','Deskripsi','textarea'],['program_id','Program','programs'],['assignee_id','Penanggung jawab','profiles'],['status','Status',['Backlog','To Do','In Progress','Review','Done'],true],['priority','Prioritas',['Low','Medium','High'],true],['due_date','Deadline','date']],
  finances: [['description','Deskripsi','text',true],['program_id','Program','programs'],['type','Jenis',['expense','income'],true],['amount','Nominal (Rp)','number',true],['category','Kategori','text',true],['transaction_date','Tanggal','date',true],['status','Status',['pending','approved','rejected'],true]],
  inventory: [['name','Nama','text',true],['category','Kategori','text',true],['quantity','Jumlah','number',true],['status','Status',['Available','Borrowed','Maintenance','Lost'],true],['condition','Kondisi',['Baik','Perawatan','Rusak'],true],['location','Lokasi','text']],
};
const defaults = { events: { start_date: today(), end_date: today(), status: 'Planning', permit_status: 'Pending' }, programs: { start_date: today(), end_date: today(), progress: 0, budget: 0 }, tasks: { status: 'To Do', priority: 'Medium' }, finances: { transaction_date: today(), status: 'pending' }, inventory: { quantity: 1, condition: 'Baik' } };
export default function Editor({ resource, item, onClose, onSaved }) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState({});
  const [choiceError, setChoiceError] = useState('');
  const dialog = useRef(null);
  const fields = schemas[resource].filter(([name]) => name !== 'assignee_id' || canManage(user));
  useEffect(() => {
    dialog.current?.focus();
    const sources = [...new Set(schemas[resource].filter(([name]) => name !== 'assignee_id' || canManage(user)).map(field => field[2]).filter(type => type === 'programs' || type === 'profiles'))];
    let active = true;
    Promise.all(sources.map(async source => [source, await listAll(`/${source}`)]))
      .then(entries => { if (active) setChoices(Object.fromEntries(entries)); })
      .catch(failure => { if (active) setChoiceError(failure.message); });
    return () => { active = false; };
  }, [resource, user]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fields.map(([name,,type]) => {
      const value = form.get(name);
      return [name, type === 'number' ? Number(value) : value === '' ? null : value];
    }));
    if (resource === 'tasks' && !canManage(user)) payload.assignee_id = item?.assignee_id || user.id;
    // Retain stored legacy icon data when editing; decorative emojis are no longer rendered.
    if (resource === 'inventory') payload.emoji = item?.emoji ?? null;
    try { await api(`/${resource}${item?.id ? `/${item.id}` : ''}`, { method: item?.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); onSaved(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><section className="card editor" role="dialog" aria-modal="true" aria-labelledby="editor-title" tabIndex={-1} ref={dialog} onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose();
    if (event.key === 'Tab') {
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input,select,textarea')];
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    } }}><h2 id="editor-title">{item?.id ? 'Edit' : 'Tambah'} {resourceLabels[resource]}</h2><form onSubmit={submit}><div className="form-grid">{fields.map(([name,label,type,required]) => {
    const value = item?.[name] ?? defaults[resource]?.[name] ?? (Array.isArray(type) ? type[0] : '');
    const linked = type === 'profiles' || type === 'programs';
    return <label key={name}>{label}{Array.isArray(type) || linked ? <select aria-label={label} name={name} required={required} defaultValue={value}>{linked && <option value="">Tidak dipilih</option>}{(linked ? choices[type] || [] : type).map(option => <option key={linked ? option.id : option} value={linked ? option.id : option}>{linked ? option.name : option}</option>)}</select> : type === 'textarea' ? <textarea name={name} defaultValue={value} maxLength={2000} /> : <input name={name} type={type} defaultValue={value} required={required} min={type === 'number' ? (name === 'amount' ? 0.01 : 0) : undefined} max={name === 'progress' ? 100 : name === 'quantity' ? 1000000 : undefined} step={['amount','budget'].includes(name) ? '0.01' : type === 'number' ? '1' : undefined} maxLength={160} />}</label>;
  })}</div>{choiceError && <p className="error" role="alert">Pilihan relasi gagal dimuat: {choiceError}</p>}{error && <p className="error" role="alert">{error}</p>}<div className="actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Batal</button><button className="primary" disabled={busy || Boolean(choiceError)}>{busy ? 'Menyimpan…' : 'Simpan'}</button></div></form></section></div>;
}
