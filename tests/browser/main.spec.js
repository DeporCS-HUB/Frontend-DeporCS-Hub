import { test, expect } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', name: 'Development Staff', role: 'staff' };
const summary = { activePrograms: 1, totalPrograms: 1, completedPrograms: 0, pendingTasks: 1, completedTasks: 0, budget: 1000000, income: 0, expense: 0, remaining: 1000000, totalAssets: 3, budgetUtilization: 0 };
async function mockApi(page, role = 'staff') {
 let signedIn = false; const counts = {}; const extraProfiles=[];
 let profile = { ...user, role, departmentRole: role === 'member' ? 'staff' : 'bph' };
 let failEvent = false; let failProfile = false;
 const rows = { events: [], programs: [], finances: [], inventory: [], tasks: [{ id: 'task-id', title: 'Review proposal', description: '', status: 'To Do', priority: 'Medium', program_id: null, assignee_id: user.id, due_date: null, created_by: user.id }] };
 let failTask = false; let failProgress = false; let progressUpdates = 0;
 await page.route('**/api/**', async route => {
  const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/', '');
  const key = req.method() + ' ' + path; counts[key] = (counts[key] || 0) + 1;
  const reply = (data, status = 200) => route.fulfill({ status, json: status >= 400 ? { error: { message: data } } : { data } });
  if (path === 'auth/refresh') return signedIn ? reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }) : reply('Session expired', 401);
  if (path === 'auth/login') { signedIn = true; return reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }); }
  if (path === 'auth/logout') { signedIn = false; return reply({ loggedOut: true }); }
  if (path === 'dashboard') return reply({ overview: {proker: rows.programs.filter(p=>p.kind==='Proker').length, ukor: rows.programs.filter(p=>p.kind==='UKOR').length, openTasks: rows.tasks.filter(t=>t.status!=='Done').length, overdueTasks:0}, programFocus: rows.programs, upcomingMilestones: rows.programs.filter(p=>p.milestone_date), attentionTasks: rows.tasks.filter(t=>t.status!=='Done'), staffPerformance: role==='member' ? [{id:profile.id,name:profile.name,programs:rows.programs.filter(p=>p.assignee_ids?.includes(profile.id)),assignedTasks:rows.tasks.filter(t=>t.assignee_id===profile.id).length,completedTasks:rows.tasks.filter(t=>t.assignee_id===profile.id&&t.status==='Done').length,reviewTasks:0,overdueTasks:0,updatesLast30Days:progressUpdates,lastUpdate:null}] : [], summary, monthly: [{ month: 10, income: 0, expense: 0 }], inventory: [{ status: 'Available', quantity: 3 }], upcomingPrograms: [] });
  if (path === 'profiles') return reply([profile,...extraProfiles]);
  if (path === 'profiles/me') {
   if (failProfile) return reply('Profile unavailable', 503);
   profile = { ...profile, name: req.postDataJSON().name }; return reply(profile);
  }
  if (path.startsWith('events') && req.method() !== 'GET' && failEvent) return reply('Event unavailable',503);
  if (path.endsWith('/progress') && req.method()==='PUT') { if(failProgress) return reply('Progress unavailable',503); const id=path.split('/')[1]; const row=rows.programs.find(p=>p.id===id); if(role==='member'&&!row?.assignee_ids?.includes(profile.id)) return reply('Forbidden',403); Object.assign(row,req.postDataJSON());progressUpdates++;return reply(row); }
  const [resource, id] = path.split('/');
  if (req.method() === 'GET') return reply(rows[resource] || []);
  if (req.method() === 'PUT' && resource === 'tasks' && failTask) return reply('Database unavailable', 503);
  if (req.method() === 'POST') { const data = { ...req.postDataJSON(), id: `${resource}-id`, created_by: user.id };rows[resource].push(data);return reply(data,201); }
  if (req.method() === 'PUT') { const data = { ...rows[resource].find(row => row.id === id), ...req.postDataJSON() };rows[resource] = rows[resource].map(row => row.id === id ? data : row);return reply(data); }
  if (req.method() === 'DELETE') { rows[resource] = rows[resource].filter(row => row.id !== id);return reply({ deleted: true }); }
  return reply('Not found',404);
 });
 return { failEvent() { failEvent = true; }, failProfile() { failProfile = true; }, failTask() { failTask = true; }, failProgress() { failProgress=true; }, profiles:extraProfiles, rows, counts };
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
 await page.getByRole('button', { name: 'Tambah program' }).click();
 await page.getByLabel('Nama', { exact: true }).fill('Development Tournament');
 await page.getByLabel('PIC', { exact: true }).fill('Development Staff');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Development Tournament' })).toBeVisible();
 await page.getByRole('button', { name: 'Edit', exact: true }).click();
 await page.getByLabel('Status', { exact: true }).selectOption('Completed');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: /Selesai/ })).toBeVisible();
 await page.reload(); await expect(page.getByRole('cell', { name: 'Development Tournament' })).toBeVisible();
 page.once('dialog', dialog => dialog.accept());
 await page.getByRole('button', { name: 'Hapus', exact: true }).click();
 await expect(page.getByText('Belum ada data.', { exact: true })).toBeVisible();
 await page.getByRole('button', { name: 'Logout', exact: true }).click();
 await expect(page).toHaveURL(/login/);
});
test('failed task update displays error and retains old board status', async ({ page }) => {
 const mock = await mockApi(page); await login(page);
 await page.getByRole('link', { name: 'Tugas', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Review proposal' })).toBeVisible();
 mock.failTask(); await page.getByLabel('Status Review proposal').selectOption('Done');
 await expect(page.getByRole('alert')).toHaveText('Database unavailable');
 await expect(page.getByLabel('Status Review proposal')).toHaveValue('To Do');
});
test('Staff has read-only program controls and can create own tasks', async ({ page }) => {
 await mockApi(page,'member'); await login(page);
 await page.getByRole('link', { name: 'Program', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Tambah program' })).toHaveCount(0);
 await page.getByRole('link', { name: 'Tugas', exact: true }).click();
 await page.getByRole('button', { name: 'Tambah tugas', exact: true }).click();
 await page.getByLabel('Judul').fill('Member task');
 await expect(page.getByLabel('Penanggung jawab')).toHaveCount(0);
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Member task' })).toBeVisible();
});
test('inventory and finance creation use API-backed forms', async ({ page }) => {
 await mockApi(page);await login(page);
 await page.getByRole('link', { name:'Inventaris',exact:true }).click();
 await page.getByRole('button', { name:'Tambah barang' }).click();
 await page.getByLabel('Nama',{exact:true}).fill('Development Ball');
 await page.getByLabel('Kategori',{exact:true}).fill('Sports');
 await page.getByRole('button', { name:'Simpan',exact:true }).click();
 await expect(page.getByRole('heading',{name:'Development Ball'})).toBeVisible();
 await page.getByRole('link', { name:'Keuangan',exact:true }).click();
 await page.getByRole('button', { name:'Tambah transaksi' }).click();
 await page.getByLabel('Deskripsi',{exact:true}).fill('Development purchase');
 await page.getByLabel('Nominal (Rp)',{exact:true}).fill('100000');
 await page.getByLabel('Kategori',{exact:true}).fill('Equipment');
 await page.getByRole('button', { name:'Simpan',exact:true }).click();
 await expect(page.getByRole('cell',{name:'Development purchase'})).toBeVisible();
});

test('BPH event CRUD retains permit status after reload', async ({ page }) => {
 await mockApi(page); await login(page);
 await page.getByRole('link', { name: 'Kegiatan', exact: true }).click();
 await page.getByRole('button', { name: 'Tambah kegiatan' }).click();
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
 await page.getByRole('link', { name: 'Kegiatan', exact: true }).click();
 await page.getByRole('button', { name: 'Tambah kegiatan' }).click();
 await page.getByLabel('Nama', { exact: true }).fill('Failed Event');
 await page.getByLabel('Venue', { exact: true }).fill('SOR');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('alert')).toHaveText('Event unavailable');
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('cell', { name: 'Failed Event' })).toHaveCount(0);
});
test('member has read-only events and saves own profile across reload', async ({ page }) => {
 const mock = await mockApi(page, 'member'); await login(page);
 await page.getByRole('link', { name: 'Kegiatan', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Tambah kegiatan' })).toHaveCount(0);
 await page.getByRole('link', { name: 'Pengaturan', exact: true }).click();
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
 await page.getByRole('link', { name: 'Tim', exact: true }).click();
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
 await page.getByRole('link', { name: 'Tugas', exact: true }).click();
 const other = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Other assignment' }) });
 await expect(other).toHaveAttribute('draggable', 'false');
 await expect(other.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
 await expect(other.getByRole('combobox')).toHaveCount(0);
 await expect(page.getByLabel('Status Review proposal')).toBeVisible();
});

test('navigation reuses dashboard summary and a successful write requests a fresh summary', async ({ page }) => {
 const mock = await mockApi(page); await login(page);
 for (const name of ['Program','Inventaris','Keuangan']) {
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
 }
 await expect(page.getByRole('heading', { name: 'Keuangan' })).toBeVisible();
 await expect.poll(() => mock.counts['GET dashboard']).toBe(1);
 await page.getByRole('button', { name: 'Tambah transaksi' }).click();
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

test('dark workspace keeps accessible navigation when collapsed', async ({ page }, testInfo) => {
 await page.setViewportSize({ width: 1440, height: 1100 });
 await mockApi(page); await login(page);
 await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
 await expect(page.getByRole('heading',{name:'Performa Staff'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Progres Proker & UKOR'})).toBeVisible();
 await expect(page.locator('.hero, .hero-time')).toHaveCount(0);
 const palette = await page.evaluate(() => { const css = getComputedStyle(document.documentElement); return ['--background','--dark-red','--white'].map(key => css.getPropertyValue(key).trim()); });
 expect(palette).toEqual(['#09090B','#5F3031','#F5F6F7']);
 await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
 await page.getByRole('button', { name: 'Ringkas navigasi' }).click();
 const program = page.getByRole('link', { name: 'Program', exact: true });
 await expect(program).toBeVisible(); await program.click();
 await expect(page.getByRole('heading', { name: 'Program kerja' })).toBeVisible();
 await page.getByRole('button', { name: 'Tambah program' }).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.screenshot({ path: testInfo.outputPath('editor-desktop.png'), fullPage: true });
 await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('mobile menu and create form remain usable at 375px without page overflow', async ({ page }, testInfo) => {
 await page.setViewportSize({ width: 375, height: 812 });
 await mockApi(page); await login(page);
 await expect(page.getByRole('heading',{name:'Performa Staff'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Progres Proker & UKOR'})).toBeVisible();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
 await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
 await page.getByRole('button', { name: 'Buka navigasi' }).click();
 await page.getByRole('link', { name: 'Program', exact: true }).click();
 await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
 await page.getByRole('button', { name: 'Tambah program' }).click();
 const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
 const rect = await dialog.boundingBox(); expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(375);
 await page.screenshot({ path: testInfo.outputPath('editor-mobile.png'), fullPage: true });
 await page.getByLabel('Nama', { exact: true }).fill('Mobile program');
 await page.getByLabel('PIC', { exact: true }).fill('Development Staff');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Mobile program' })).toBeVisible();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});


test('assigned Staff edits UKOR progress, sees updated dashboard and retains it after reload', async ({page},testInfo)=>{
 const mock=await mockApi(page,'member');
 mock.rows.programs.push({id:'shared-unit',name:'Shared sports unit',kind:'UKOR',pic:'Development Staff',assignee_ids:[user.id],status:'Active',progress:null,progress_notes:'Routine being prepared',budget:null});
 mock.rows.programs.push({id:'other-unit',name:'Other sports unit',kind:'UKOR',pic:'Other Staff',assignee_ids:['other-user'],status:'Planning',progress:null,budget:null});
 await login(page);
 await expect(page.getByRole('heading',{name:'Performa Staff'})).toBeVisible();
 await page.getByRole('button',{name:'UKOR',exact:true}).click();
 await expect(page.getByText('Persentase belum diisi')).toHaveCount(2);
 await page.getByRole('link',{name:'Program',exact:true}).click();
 const row=page.getByRole('row').filter({has:page.getByText('Shared sports unit',{exact:true})});
 const other=page.getByRole('row').filter({has:page.getByText('Other sports unit',{exact:true})});
 await expect(other.getByRole('button',{name:'Update progres'})).toHaveCount(0);
 await expect(row.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
 await row.getByRole('button',{name:'Update progres'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Edit progres'})).toBeVisible();
 await expect(dialog.getByLabel('Budget (Rp)')).toHaveCount(0);
 await dialog.getByLabel('Progress (%)',{exact:true}).fill('35');
 await dialog.getByLabel('Catatan progres',{exact:true}).fill('Two practice sessions recorded');
 await dialog.getByRole('button',{name:'Simpan',exact:true}).click();
 await expect(row.getByText('35%')).toBeVisible();
 await page.reload();await expect(page.getByText('Two practice sessions recorded')).toBeVisible();
 mock.failProgress();await row.getByRole('button',{name:'Update progres'}).click();
 await page.getByLabel('Progress (%)',{exact:true}).fill('70');await page.getByRole('button',{name:'Simpan',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('Progress unavailable');await page.getByRole('button',{name:'Batal',exact:true}).click();
 await expect(row.getByText('35%')).toBeVisible();
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();
 await page.getByRole('button',{name:'UKOR',exact:true}).click();
 await expect(page.getByText('Two practice sessions recorded')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('staff-workspace.png'),fullPage:true});
});

test('BPH selects multiple PJ and leaves unspecified dates and percentages empty',async ({page})=>{
 const mock=await mockApi(page);mock.profiles.push({id:'second-pj',name:'Other Staff',role:'member',departmentRole:'staff'});await login(page);await page.getByRole('link',{name:'Program',exact:true}).click();
 await page.getByRole('button',{name:'Tambah program'}).click();
 await page.getByLabel('Nama',{exact:true}).fill('Multi PJ activity');await page.getByLabel('PIC',{exact:true}).fill('Development Staff');
 await page.getByLabel('Jenis kegiatan',{exact:true}).selectOption('UKOR');await page.getByLabel('Akun PJ').selectOption([user.id,'second-pj']);
 await expect(page.getByLabel('Mulai',{exact:true})).toHaveValue('');await expect(page.getByLabel('Progress (%)',{exact:true})).toHaveValue('');
 await page.getByLabel('Agenda berikutnya').fill('Main event');await page.getByLabel('Tanggal agenda').fill('2026-10-31');
 await page.getByRole('button',{name:'Simpan',exact:true}).click();
 const row=page.getByRole('row').filter({has:page.getByText('Multi PJ activity',{exact:true})});
 await expect(row.getByText('UKOR',{exact:true})).toBeVisible();await expect(row.getByText('Belum diisi')).toHaveCount(2);
 expect(mock.rows.programs[0].assignee_ids).toHaveLength(2);
 await row.getByRole('button',{name:'Update progres'}).click();await expect(page.getByLabel('Progress (%)',{exact:true})).toHaveValue('');
});
