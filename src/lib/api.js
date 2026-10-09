const base = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
let snapshot = { user: null, loading: true, error: '' };
let accessToken = null;
let refreshPromise;
let bootstrapPromise;
const listeners = new Set();
const dataListeners = new Set();
let dataRevision = 0;
export const dataStore = {
  subscribe(listener) { dataListeners.add(listener); return () => dataListeners.delete(listener); },
  getSnapshot() { return dataRevision; },
};
export const authStore = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot() { return snapshot; },
};
function publish(user, error = '') {
  snapshot = { user, loading: false, error };
  listeners.forEach(listener => listener());
}
function accept(data) { accessToken = data.accessToken; publish(data.user); return data; }
async function send(path, options = {}, authenticated = true) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options, credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers },
    });
  } catch { throw new Error('Server tidak dapat dihubungi. Periksa koneksi lalu coba kembali.'); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || `Operasi gagal (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return body;
}
export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = send('/auth/refresh', { method: 'POST' }, false)
      .then(({ data }) => accept(data))
      .catch(error => { accessToken = null; publish(null, error.status === 401 ? '' : error.message); throw error; })
      .finally(() => { refreshPromise = undefined; });
  }
  return refreshPromise;
}
export function bootstrapSession() {
  if (!bootstrapPromise) bootstrapPromise = refreshSession().catch(() => undefined);
  return bootstrapPromise;
}
export async function login(email, password) {
  const { data } = await send('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  return accept(data);
}
export async function updateProfile(name) {
  const userId = snapshot.user?.id;
  const { data } = await api('/profiles/me', { method: 'PUT', body: JSON.stringify({ name }) });
  if (snapshot.user?.id === userId && data.id === userId) publish({ ...snapshot.user, name: data.name });
  return data;
}
export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); accessToken = null; publish(null); }
  catch (error) { accessToken = null; publish(null, `Logout server gagal: ${error.message}`); throw error; }
}
async function requestWithSession(path, options = {}) {
  try { return await send(path, options); }
  catch (error) {
    if (error.status !== 401) throw error;
    await refreshSession();
    try { return await send(path, options); }
    catch (retryError) { if (retryError.status === 401) { accessToken = null; publish(null, 'Session berakhir. Silakan login kembali.'); } throw retryError; }
  }
}
export async function listAll(path) {
  const rows = [];
  for (let page = 0; page < 1000; page++) {
    const { data } = await api(`${path}?size=100&page=${page}`);
    rows.push(...data);
    if (data.length < 100) return rows;
  }
  throw new Error('Data terlalu banyak. Hubungi admin untuk membatasi daftar.');
}

export async function api(path, options = {}) {
  const result = await requestWithSession(path, options);
  if (options.method && options.method !== 'GET' && !path.startsWith('/auth/')) {
    dataRevision++;
    dataListeners.forEach(listener => listener());
  }
  return result;
}
