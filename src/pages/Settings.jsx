import { useState } from 'react';
import { PageTitle, Card } from '../components/UI';
import { useAuth } from '../lib/hooks';
import { roleLabel } from '../lib/roles';
import { updateProfile } from '../lib/api';

export default function Settings() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('name').trim();
    setError(''); setSaved(false);
    if (!name) { setError('Nama tidak boleh kosong.'); return; }
    setBusy(true);
    try { await updateProfile(name); setSaved(true); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <><PageTitle title="Pengaturan" subtitle="Pengaturan profil akun" /><Card className="settings"><h3>Profil</h3><p>Role: {roleLabel(user)}</p>
    <form onSubmit={submit}><label>Nama tampilan<input key={user.name} name="name" defaultValue={user.name} maxLength={120} required disabled={busy} onChange={() => setSaved(false)} /></label>
      {error && <p className="error" role="alert">{error}</p>}{saved && <p role="status">Profil berhasil disimpan.</p>}
      <div className="actions"><button className="primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan profil'}</button></div>
    </form><p>Hubungi BPH jika nama atau akses akun perlu disesuaikan.</p>
  </Card></>;
}
