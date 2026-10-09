import test from 'node:test';
import assert from 'node:assert/strict';
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const session = { accessToken: 'test-access', user: { id: 'user-id', role: 'member', name: 'Test' }, expiresIn: 3600 };
const fresh = () => import(`../src/lib/api.js?test=${Math.random()}`);
test('login stores bearer in memory and sends credentials only to the API', async () => {
 const api = await fresh(); const calls = [];
 globalThis.fetch = async (url, options) => { calls.push({ url, options }); return response({ data: session }); };
 await api.login('member@example.invalid', 'test-password');
 assert.equal(api.authStore.getSnapshot().user.role, 'member');
 assert.equal(calls[0].options.credentials, 'include');
 assert.equal(calls[0].options.headers.Authorization, undefined);
 assert.equal(JSON.parse(calls[0].options.body).email, 'member@example.invalid');
});
test('concurrent 401s refresh once, rotate session, and retry with the new bearer', async () => {
 const api = await fresh(); let refreshes = 0; let reads = 0;
 globalThis.fetch = async (url, options) => {
  if (url.endsWith('/auth/login')) return response({ data: session });
  if (url.endsWith('/auth/refresh')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return response({ data: { ...session, accessToken: 'rotated-access' } }); }
  reads++; return options.headers.Authorization === 'Bearer rotated-access' ? response({ data: ['real-row'] }) : response({ error: { message: 'Expired' } }, 401);
 };
 await api.login('member@example.invalid','test-password');
 const result = await Promise.all([api.api('/tasks'),api.api('/programs')]);
 assert.equal(refreshes,1);assert.equal(reads,4);assert.deepEqual(result[0].data,['real-row']);
});
test('failed refresh clears the protected session', async () => {
 const api = await fresh();
 globalThis.fetch = async url => url.endsWith('/auth/login') ? response({ data: session }) : response({ error: { message: 'Session expired' } },401);
 await api.login('member@example.invalid','test-password');
 await assert.rejects(api.api('/dashboard'), /Session expired/);
 assert.equal(api.authStore.getSnapshot().user,null);
});
test('403 does not refresh or pretend success', async () => {
 const api = await fresh();let calls = 0;
 globalThis.fetch = async () => { calls++;return response({ error: { message: 'Forbidden' } },403); };
 await assert.rejects(api.api('/programs',{method:'POST',body:'{}'}),/Forbidden/);assert.equal(calls,1);assert.equal(api.dataStore.getSnapshot(),0);
});
test('only committed mutations invalidate dashboard statistics', async () => {
 const api = await fresh();globalThis.fetch = async () => response({ data:{id:'row-id'} });
 await api.api('/inventory',{method:'POST',body:'{}'});assert.equal(api.dataStore.getSnapshot(),1);
 await api.api('/dashboard');assert.equal(api.dataStore.getSnapshot(),1);
});
test('network errors remain actionable errors', async () => {
 const api = await fresh();globalThis.fetch = async () => { throw new TypeError('network unavailable'); };
 await assert.rejects(api.api('/tasks'),/Server tidak dapat dihubungi/);
});
test('list pagination retrieves records beyond the first page', async () => {
 const api = await fresh();globalThis.fetch = async url => response({ data: url.includes('page=0') ? Array.from({length:100},(_,id)=>({id})) : [{id:100}] });
 const rows = await api.listAll('/programs');assert.equal(rows.length,101);
});
test('logout failure clears local bearer but reports server failure', async () => {
 const api = await fresh();globalThis.fetch = async url => url.endsWith('/auth/login') ? response({ data: session }) : response({ error:{message:'Unavailable'} },503);
 await api.login('member@example.invalid','test-password');await assert.rejects(api.logout(),/Unavailable/);assert.equal(api.authStore.getSnapshot().user,null);assert.match(api.authStore.getSnapshot().error,/Logout server gagal/);
});

test('profile update publishes confirmed name while keeping the trusted role', async () => {
 const api = await fresh();
 globalThis.fetch = async url => url.endsWith('/auth/login') ? response({ data: session }) : response({ data: { ...session.user, name: 'Updated', role: 'admin' } });
 await api.login('member@example.invalid','test-password');
 await api.updateProfile('Updated');
 assert.equal(api.authStore.getSnapshot().user.name,'Updated');
 assert.equal(api.authStore.getSnapshot().user.role,'member');
});
test('failed profile update retains previous name and invalidates no data', async () => {
 const api = await fresh();
 globalThis.fetch = async url => url.endsWith('/auth/login') ? response({ data: session }) : response({ error: { message: 'Unavailable' } },503);
 await api.login('member@example.invalid','test-password');
 await assert.rejects(api.updateProfile('Failed'),/Unavailable/);
 assert.equal(api.authStore.getSnapshot().user.name,'Test');
 assert.equal(api.dataStore.getSnapshot(),0);
});

test('GETs deduplicate, successful writes invalidate, and failed writes retain the cache', async () => {
 const api = await fresh(); let reads = 0; let fail = false;
 globalThis.fetch = async (url, options) => {
  if (url.endsWith('/auth/login')) return response({ data: session });
  if (options.method === 'POST') return fail ? response({ error: { message: 'Unavailable' } }, 503) : response({ data: { id: 'new' } });
  reads++; return response({ data: [reads] });
 };
 await api.login('member@example.invalid', 'test');
 await Promise.all([api.api('/tasks'), api.api('/tasks')]); assert.equal(reads, 1);
 await api.api('/tasks'); assert.equal(reads, 1);
 fail = true; await assert.rejects(api.api('/tasks', { method: 'POST', body: '{}' }), /Unavailable/);
 await api.api('/tasks'); assert.equal(reads, 1);
 fail = false; await api.api('/tasks', { method: 'POST', body: '{}' });
 await api.api('/tasks'); assert.equal(reads, 2);
 await api.api('/tasks', { force: true }); assert.equal(reads, 3);
});
test('logout, account change and trusted role changes clear read data; token rotation keeps same-user data', async () => {
 const api = await fresh(); let profile = session; let reads = 0;
 globalThis.fetch = async url => {
  if (url.endsWith('/auth/login') || url.endsWith('/auth/refresh')) return response({ data: profile });
  if (url.endsWith('/auth/logout')) return response({ data: { loggedOut: true } });
  reads++; return response({ data: [profile.user.id, reads] });
 };
 await api.login('first@example.invalid', 'test'); await api.api('/tasks');
 profile = { ...session, accessToken: 'rotated' }; await api.refreshSession(); await api.api('/tasks'); assert.equal(reads, 1);
 profile = { ...session, user: { ...session.user, role: 'staff', departmentRole: 'bph' } };
 await api.refreshSession(); assert.equal(api.cachedResource('/tasks'), undefined);
 await api.api('/tasks'); assert.equal(reads, 2);
 profile = { ...session, user: { ...session.user, id: 'other-user' } };
 await api.login('other@example.invalid', 'test'); assert.equal(api.cachedResource('/tasks'), undefined);
 await api.api('/tasks'); assert.equal(reads, 3);
 await api.logout(); assert.equal(api.cachedResource('/tasks'), undefined);
});
test('pending read from a previous account cannot return or cache that account data', async () => {
 const api = await fresh(); let profile = session; let finish;
 globalThis.fetch = async url => {
  if (url.endsWith('/auth/login')) return response({ data: profile });
  return new Promise(resolve => { finish = () => resolve(response({ data: ['previous-account'] })); });
 };
 await api.login('first@example.invalid', 'test');
 const pending = api.api('/tasks'); await Promise.resolve(); await Promise.resolve();
 profile = { ...session, user: { ...session.user, id: 'other' } };
 await api.login('other@example.invalid', 'test'); finish();
 await assert.rejects(pending, /Session berubah/); assert.equal(api.cachedResource('/tasks'), undefined);
});
test('failed logout clears cached data and authentication endpoints always reach the server', async () => {
 const api = await fresh(); let calls = 0;
 globalThis.fetch = async url => {
  calls++;
  if (url.endsWith('/auth/login')) return response({ data: session });
  if (url.endsWith('/auth/logout')) return response({ error: { message: 'Unavailable' } }, 503);
  return response({ data: ['row'] });
 };
 await api.login('member@example.invalid', 'test'); await api.api('/tasks');
 await assert.rejects(api.logout(), /Unavailable/); assert.equal(api.cachedResource('/tasks'), undefined);
 const before = calls; await api.api('/auth/session'); await api.api('/auth/session'); assert.equal(calls - before, 2);
});
