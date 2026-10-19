import { useRef, useState } from 'react';
import { Camera, LockKeyhole, UserRound, Upload, X } from 'lucide-react';
import { PageTitle, Card } from '../components/UI';
import Avatar from '../components/Avatar';
import { useAuth } from '../lib/hooks';
import { roleLabel } from '../lib/roles';
import { updateProfile, updateAvatar, changePassword, refreshData } from '../lib/api';
import { prepareAvatar } from '../lib/avatar';
export default function Settings() {
 const { user } = useAuth();
 return <><PageTitle title="Pengaturan" subtitle="Profil dan keamanan akun Anda." /><div className="account-settings"><PhotoSettings user={user} /><div className="account-settings-main"><ProfileSettings user={user} /><PasswordSettings /></div></div></>;
}
function PhotoSettings({ user }) {
 const [selection,setSelection] = useState(null); const [busy,setBusy] = useState(false); const [processing,setProcessing] = useState(false); const [error,setError] = useState(''); const [saved,setSaved] = useState(''); const input = useRef(null);
 async function choose(event) {
  const file = event.target.files?.[0]; if (!file) return; setError(''); setSaved(''); setProcessing(true); setSelection(null);
  try { setSelection(await prepareAvatar(file)); } catch(e) { setError(e.message); } finally { setProcessing(false); if(input.current)input.current.value=''; }
 }
 async function save(remove = false) {
  if (busy || processing || (!remove && !selection)) return; setBusy(true); setError(''); setSaved('');
  try { await updateAvatar(remove ? null : selection.encoded); setSelection(null); setSaved(remove ? 'Foto profil dihapus.' : 'Foto profil diperbarui.'); }
  catch(e) { setError(e.message); } finally { setBusy(false); }
 }
 return <Card className="photo-settings"><div className="settings-section-title"><Camera size={18} /><h2>Foto profil</h2></div><div className="photo-preview">{selection ? <img src={selection.preview} alt="Pratinjau foto profil" /> : <Avatar user={user} large />}</div><b className="photo-account-name">{user.name}</b><small className="photo-role">{roleLabel(user)}</small><p>JPG, PNG, atau WebP, maksimal 5 MB. Foto disesuaikan menjadi persegi.</p><label className="photo-file-label"><Upload size={16} />{processing ? 'Memproses foto…' : 'Pilih foto'}<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Pilih foto profil" disabled={busy || processing} onChange={choose} /></label>{selection && <div className="photo-save-actions"><button className="primary" disabled={busy} onClick={() => save()}>{busy ? 'Menyimpan…' : 'Simpan foto'}</button><button className="secondary" aria-label="Batalkan foto" disabled={busy} onClick={() => setSelection(null)}><X size={16} /></button></div>}{user.avatar_path && !selection && <button className="text-button danger-text" disabled={busy || processing} onClick={() => save(true)}>Hapus foto</button>}<button className="text-button" onClick={refreshData} disabled={busy}>Muat ulang foto</button>{error && <p className="error" role="alert">{error}</p>}{saved && <p className="settings-success" role="status">{saved}</p>}</Card>;
}
function ProfileSettings({ user }) {
 const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [saved,setSaved] = useState(false);
 async function submit(event) {
  event.preventDefault(); const name = new FormData(event.currentTarget).get('name').trim(); setError(''); setSaved(false);
  if (!name) { setError('Nama tidak boleh kosong.'); return; } setBusy(true);
  try { await updateProfile(name); setSaved(true); } catch(e) { setError(e.message); } finally { setBusy(false); }
 }
 return <Card className="settings profile-settings"><div className="settings-section-title"><UserRound size={18} /><h2>Profil akun</h2></div><form onSubmit={submit}><label>Nama tampilan<input key={user.name} name="name" autoComplete="name" defaultValue={user.name} maxLength={120} required disabled={busy} onChange={() => setSaved(false)} /></label>{error && <p className="error" role="alert">{error}</p>}{saved && <p role="status" className="settings-success">Profil berhasil disimpan.</p>}<div className="settings-form-footer"><small>Akses akun dikelola oleh BPH.</small><button className="primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan profil'}</button></div></form></Card>;
}
function PasswordSettings() {
 const [current,setCurrent] = useState(''); const [next,setNext] = useState(''); const [confirmation,setConfirmation] = useState(''); const [visible,setVisible] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [saved,setSaved] = useState(false);
 async function submit(event) {
  event.preventDefault(); setError(''); setSaved(false);
  if(next.length < 8) { setError('Password baru minimal 8 karakter.'); return; }
  if(next !== confirmation) { setError('Konfirmasi password baru belum sama.'); return; }
  if(current === next) { setError('Password baru harus berbeda dari password saat ini.'); return; }
  setBusy(true);
  try { await changePassword(current,next); setCurrent('');setNext('');setConfirmation('');setVisible(false);setSaved(true); } catch(e) { setError(e.message); } finally { setBusy(false); }
 }
 function edit(setter,value) { setter(value);setSaved(false); }
 return <Card className="settings password-settings"><div className="settings-section-title"><LockKeyhole size={18} /><h2>Ganti password</h2></div><p>Masukkan password saat ini untuk memverifikasi akun Anda.</p><form onSubmit={submit}><label>Password saat ini<input type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={1024} value={current} onChange={e => edit(setCurrent,e.target.value)} disabled={busy} /></label><div className="password-fields"><label>Password baru<input type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={next} onChange={e => edit(setNext,e.target.value)} disabled={busy} /></label><label>Konfirmasi password baru<input type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={e => edit(setConfirmation,e.target.value)} disabled={busy} /></label></div><label className="password-visibility"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />Tampilkan password</label>{error && <p className="error" role="alert">{error}</p>}{saved && <p className="settings-success" role="status">Password berhasil diubah.</p>}<div className="settings-form-footer"><small>Minimal 8 karakter, berbeda dari password saat ini.</small><button className="primary" disabled={busy}>{busy ? 'Memverifikasi…' : 'Ganti password'}</button></div></form></Card>;
}
