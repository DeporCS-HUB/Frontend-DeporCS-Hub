import { test, expect } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', name: 'Development Staff', role: 'staff' };
const summary = { activePrograms: 1, totalPrograms: 1, completedPrograms: 0, pendingTasks: 1, completedTasks: 0, budget: 1000000, income: 0, expense: 0, remaining: 1000000, totalAssets: 3, budgetUtilization: 0 };
async function mockApi(page, role = 'staff') {
 let signedIn = false; const counts = {};
 let profile = { ...user, role, departmentRole: role === 'member' ? 'staff' : 'bph' };
 let failEvent = false; let failProfile = false;
 const rows = { events: [], programs: [], finances: [], inventory: [], tasks: [{ id: 'task-id', title: 'Review proposal', description: '', status: 'To Do', priority: 'Medium', program_id: null, assignee_id: user.id, due_date: null, created_by: user.id }] };
 let failTask = false;
 await page.route('**/api/**', async route => {
  const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/', '');
  const key = req.method() + ' ' + path; counts[key] = (counts[key] || 0) + 1;
  const reply = (data, status = 200) => route.fulfill({ status, json: status >= 400 ? { error: { message: data } } : { data } });
  if (path === 'auth/refresh') return signedIn ? reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }) : reply('Session expired', 401);
  if (path === 'auth/login') { signedIn = true; return reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }); }
  if (path === 'auth/logout') { signedIn = false; return reply({ loggedOut: true }); }
  if (path === 'dashboard') return reply({ summary, monthly: [{ month: 10, income: 0, expense: 0 }], inventory: [{ status: 'Available', quantity: 3 }], upcomingPrograms: [] });
  if (path === 'profiles') return reply([profile]);
  if (path === 'profiles/me') {
   if (failProfile) return reply('Profile unavailable', 503);
   profile = { ...profile, name: req.postDataJSON().name }; return reply(profile);
  }
  if (path.startsWith('events') && req.method() !== 'GET' && failEvent) return reply('Event unavailable',503);
  const [resource, id] = path.split('/');
  if (req.method() === 'GET') return reply(rows[resource] || []);
  if (req.method() === 'PUT' && resource === 'tasks' && failTask) return reply('Database unavailable', 503);
  if (req.method() === 'POST') { const data = { ...req.postDataJSON(), id: `${resource}-id`, created_by: user.id };rows[resource].push(data);return reply(data,201); }
  if (req.method() === 'PUT') { const data = { ...rows[resource].find(row => row.id === id), ...req.postDataJSON() };rows[resource] = rows[resource].map(row => row.id === id ? data : row);return reply(data); }
  if (req.method() === 'DELETE') { rows[resource] = rows[resource].filter(row => row.id !== id);return reply({ deleted: true }); }
  return reply('Not found',404);
 });
 return { failEvent() { failEvent = true; }, failProfile() { failProfile = true; }, failTask() { failTask = true; }, rows, counts };
}
async function login(page) {
 await page.goto('/'); await expect(page).toHaveURL(/login/);
 await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
 await page.getByLabel('Password', { exact: true }).fill('development-test-password');
 await page.getByRole('button', { name: 'Login', exact: true }).click();
 await expect(page.getByText('Selamat datang, Development Staff')).toBeVisible();
}
test('protected login, program CRUD, persistence after reload, and logout', async ({ page }) => {
 await mockApi(page); await login(page);
 await page.getByRole('link', { name: 'Program', exact: true }).click();
 await page.getByRole('button', { name: 'Create Program' }).click();
 await page.getByLabel('Nama', { exact: true }).fill('Development Tournament');
 await page.getByLabel('PIC', { exact: true }).fill('Development Staff');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Development Tournament' })).toBeVisible();
 await page.getByRole('button', { name: 'Edit', exact: true }).click();
 await page.getByLabel('Status', { exact: true }).selectOption('Completed');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Completed', exact: true })).toBeVisible();
 await page.reload(); await expect(page.getByRole('cell', { name: 'Development Tournament' })).toBeVisible();
 page.once('dialog', dialog => dialog.accept());
 await page.getByRole('button', { name: 'Hapus', exact: true }).click();
 await expect(page.getByText('Belum ada data.', { exact: true })).toBeVisible();
 await page.getByRole('button', { name: 'Logout', exact: true }).click();
 await expect(page).toHaveURL(/login/);
});
test('failed task update displays error and retains old board status', async ({ page }) => {
 const mock = await mockApi(page); await login(page);
 await page.getByRole('link', { name: 'Tasks', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Review proposal' })).toBeVisible();
 mock.failTask(); await page.getByLabel('Status Review proposal').selectOption('Done');
 await expect(page.getByRole('alert')).toHaveText('Database unavailable');
 await expect(page.getByLabel('Status Review proposal')).toHaveValue('To Do');
});
test('Staff has read-only program controls and can create own tasks', async ({ page }) => {
 await mockApi(page,'member'); await login(page);
 await page.getByRole('link', { name: 'Program', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Create Program' })).toHaveCount(0);
 await page.getByRole('link', { name: 'Tasks', exact: true }).click();
 await page.getByRole('button', { name: 'Add Task', exact: true }).click();
 await page.getByLabel('Judul').fill('Member task');
 await expect(page.getByLabel('Penanggung jawab')).toHaveCount(0);
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Member task' })).toBeVisible();
});
test('inventory and finance creation use API-backed forms', async ({ page }) => {
 await mockApi(page);await login(page);
 await page.getByRole('link', { name:'Inventory',exact:true }).click();
 await page.getByRole('button', { name:'Add Asset' }).click();
 await page.getByLabel('Nama',{exact:true}).fill('Development Ball');
 await page.getByLabel('Kategori',{exact:true}).fill('Sports');
 await page.getByRole('button', { name:'Simpan',exact:true }).click();
 await expect(page.getByRole('heading',{name:'Development Ball'})).toBeVisible();
 await page.getByRole('link', { name:'Finance',exact:true }).click();
 await page.getByRole('button', { name:'Add Transaction' }).click();
 await page.getByLabel('Deskripsi',{exact:true}).fill('Development purchase');
 await page.getByLabel('Nominal (Rp)',{exact:true}).fill('100000');
 await page.getByLabel('Kategori',{exact:true}).fill('Equipment');
 await page.getByRole('button', { name:'Simpan',exact:true }).click();
 await expect(page.getByRole('cell',{name:'Development purchase'})).toBeVisible();
});

test('BPH event CRUD retains permit status after reload', async ({ page }) => {
 await mockApi(page); await login(page);
 await page.getByRole('link', { name: 'Events', exact: true }).click();
 await page.getByRole('button', { name: 'Add Event' }).click();
 await page.getByLabel('Nama', { exact: true }).fill('Development Event');
 await page.getByLabel('Venue', { exact: true }).fill('SOR');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Development Event' })).toBeVisible();
 await page.getByRole('button', { name: 'Edit', exact: true }).click();
 await page.getByLabel('Status izin', { exact: true }).selectOption('Approved');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await page.reload();
 await expect(page.getByRole('cell', { name: 'Approved', exact: true })).toBeVisible();
 page.once('dialog', dialog => dialog.accept());
 await page.getByRole('button', { name: 'Hapus', exact: true }).click();
 await expect(page.getByText('Belum ada data.', { exact: true })).toBeVisible();
});
test('event write failure keeps editor open without a success row', async ({ page }) => {
 const mock = await mockApi(page); await login(page); mock.failEvent();
 await page.getByRole('link', { name: 'Events', exact: true }).click();
 await page.getByRole('button', { name: 'Add Event' }).click();
 await page.getByLabel('Nama', { exact: true }).fill('Failed Event');
 await page.getByLabel('Venue', { exact: true }).fill('SOR');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('alert')).toHaveText('Event unavailable');
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('cell', { name: 'Failed Event' })).toHaveCount(0);
});
test('member has read-only events and saves own profile across reload', async ({ page }) => {
 const mock = await mockApi(page, 'member'); await login(page);
 await page.getByRole('link', { name: 'Events', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Add Event' })).toHaveCount(0);
 await page.getByRole('link', { name: 'Settings', exact: true }).click();
 await page.getByLabel('Nama tampilan').fill('Updated Member');
 await page.getByRole('button', { name: 'Simpan profil' }).click();
 await expect(page.getByRole('status')).toHaveText('Profil berhasil disimpan.');
 await expect(page.locator('.profile b')).toHaveText('Updated Member');
 await page.reload();
 await expect(page.getByLabel('Nama tampilan')).toHaveValue('Updated Member');
 mock.failProfile();
 await page.getByLabel('Nama tampilan').fill('Failed Update');
 await page.getByRole('button', { name: 'Simpan profil' }).click();
 await expect(page.getByRole('alert')).toHaveText('Profile unavailable');
 await expect(page.locator('.profile b')).toHaveText('Updated Member');
 await expect(page.getByRole('status')).toHaveCount(0);
});

test('BPH sees management controls and Team supports role filtering', async ({ page }) => {
 await mockApi(page); await login(page);
 await expect(page.locator('.profile small')).toHaveText('BPH');
 await expect(page.getByRole('link', { name: 'Kelola program', exact: true })).toBeVisible();
 await expect(page.locator('.swimmer, .bubble')).toHaveCount(0);
 await page.getByRole('link', { name: 'Team', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Tim Departemen' })).toBeVisible();
 await page.getByLabel('Filter role').selectOption('staff');
 await expect(page.getByText('Tidak ada anggota yang sesuai filter di halaman ini.')).toBeVisible();
 await page.getByLabel('Filter role').selectOption('bph');
 await expect(page.locator('.member-list .badge')).toHaveText('BPH');
 await page.getByLabel('Cari anggota').fill('not-present');
 await expect(page.getByText('Tidak ada anggota yang sesuai filter di halaman ini.')).toBeVisible();
});
test('Staff cannot operate another person\'s task and has no management controls', async ({ page }) => {
 const mock = await mockApi(page, 'member');
 mock.rows.tasks.push({ id: 'other-task', title: 'Other assignment', description: '', status: 'To Do', priority: 'Low', created_by: 'other-user', assignee_id: 'other-user', due_date: null });
 await login(page);
 await expect(page.locator('.profile small')).toHaveText('Staff');
 await expect(page.getByRole('link', { name: 'Kelola program', exact: true })).toHaveCount(0);
 await page.getByRole('link', { name: 'Tasks', exact: true }).click();
 const other = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Other assignment' }) });
 await expect(other).toHaveAttribute('draggable', 'false');
 await expect(other.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
 await expect(other.getByRole('combobox')).toHaveCount(0);
 await expect(page.getByLabel('Status Review proposal')).toBeVisible();
});

test('navigation reuses dashboard summary and a successful write requests a fresh summary', async ({ page }) => {
 const mock = await mockApi(page); await login(page);
 for (const name of ['Program','Inventory','Finance']) {
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
 }
 await expect(page.getByRole('heading', { name: 'Finance Dashboard' })).toBeVisible();
 await expect.poll(() => mock.counts['GET dashboard']).toBe(1);
 await page.getByRole('button', { name: 'Add Transaction' }).click();
 await page.getByLabel('Deskripsi', { exact: true }).fill('Refresh summary');
 await page.getByLabel('Nominal (Rp)', { exact: true }).fill('1000');
 await page.getByLabel('Kategori', { exact: true }).fill('Equipment');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Refresh summary' })).toBeVisible();
 await expect.poll(() => mock.counts['GET dashboard']).toBe(2);
});
test('login form is visible while session restoration waits and submits only after checking', async ({ page }) => {
 await mockApi(page); let release;
 const gate = new Promise(resolve => { release = resolve; });
 await page.route('**/api/auth/refresh', async route => {
  await gate; await route.fulfill({ status: 401, json: { error: { message: 'Session expired' } } });
 });
 await page.goto('/login');
 await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Memeriksa sesi…');
 await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeDisabled();
 await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
 await page.getByLabel('Password', { exact: true }).fill('development-test-password');
 release();
 await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeEnabled();
 await page.getByRole('button', { name: 'Login', exact: true }).click();
 await expect(page.getByText('Selamat datang, Development Staff')).toBeVisible();
});
