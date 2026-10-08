import { test, expect } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', name: 'Development Staff', role: 'staff' };
const summary = { activePrograms: 1, totalPrograms: 1, completedPrograms: 0, pendingTasks: 1, completedTasks: 0, budget: 1000000, income: 0, expense: 0, remaining: 1000000, totalAssets: 3, budgetUtilization: 0 };
async function mockApi(page, role = 'staff') {
 let signedIn = false;
 let profile = { ...user, role };
 let failEvent = false; let failProfile = false;
 const rows = { events: [], programs: [], finances: [], inventory: [], tasks: [{ id: 'task-id', title: 'Review proposal', description: '', status: 'To Do', priority: 'Medium', program_id: null, assignee_id: user.id, due_date: null, created_by: user.id }] };
 let failTask = false;
 await page.route('**/api/**', async route => {
  const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/', '');
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
 return { failEvent() { failEvent = true; }, failProfile() { failProfile = true; }, failTask() { failTask = true; }, rows };
}
async function login(page) {
 await page.goto('/'); await expect(page).toHaveURL(/login/);
 await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
 await page.getByLabel('Password', { exact: true }).fill('development-test-password');
 await page.getByRole('button', { name: 'Login', exact: true }).click();
 await expect(page.getByText('Welcome back, Development Staff')).toBeVisible();
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
test('member has read-only program controls and can create own tasks', async ({ page }) => {
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

test('staff event CRUD retains permit status after reload', async ({ page }) => {
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
