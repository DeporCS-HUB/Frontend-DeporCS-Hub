import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { login } from '../lib/api';
import { useAuth } from '../lib/hooks';
export default function Login({ from }) {
  const { user, loading, error: sessionError } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={from || location.state?.from || '/'} replace />;
  async function submit(event) {
    event.preventDefault(); if (loading || busy) return; const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { await login(form.get('email').trim(), form.get('password')); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="login-shell"><div className="login-layout"><section className="login-intro"><div className="login-wordmark"><span className="brand-mark" aria-hidden="true">D</span><b>DEPOR <span>CS HUB</span></b></div><div><p className="eyebrow">DEPARTEMEN OLAHRAGA · BEM FASILKOM UI</p><h1>Departemen<br /><span>Olahraga.</span></h1><p>Proker, UKOR, dan tim dalam satu tempat.</p></div><div className="login-capabilities"><span>Proker &amp; UKOR</span><span>Tim &amp; progres</span></div></section><section className="card login-card"><div className="login-brand"><span className="eyebrow">BEM FASILKOM UI</span><h1>DEPOR<span>CS HUB</span></h1><p>Ruang kerja Departemen Olahraga.</p></div><form onSubmit={submit}><h2>Masuk ke akun</h2><label>Email<input name="email" type="email" placeholder="nama@depor.com" required autoComplete="username" maxLength={254} /></label><label>Password<input name="password" type="password" required autoComplete="current-password" maxLength={1024} /></label>{(error || sessionError) && <p role="alert" className="error">{error || sessionError}</p>}{loading && <p role="status">Memeriksa sesi…</p>}<button className="primary" disabled={busy || loading}>{busy ? 'Memproses…' : 'Login'}</button></form></section></div></main>;
}
