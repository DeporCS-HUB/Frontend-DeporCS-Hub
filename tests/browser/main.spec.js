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
  const reply = (data, status = 200, meta) => route.fulfill({ status, json: status >= 400 ? { error: { message: data } } : { data, meta } });
  if (path === 'auth/refresh') return signedIn ? reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }) : reply('Session expired', 401);
  if (path === 'auth/login') { signedIn = true; return reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }); }
  if (path === 'auth/logout') { signedIn = false; return reply({ loggedOut: true }); }
  if (path === 'dashboard') return reply({ overview: {proker: rows.programs.filter(p=>p.kind==='Proker').length, ukor: rows.programs.filter(p=>p.kind==='UKOR').length, openTasks: rows.tasks.filter(t=>t.status!=='Done').length, overdueTasks:0}, programFocus: rows.programs.slice(0,30), programStatusCounts: Object.values(rows.programs.reduce((acc,p)=>{const key=p.kind+p.status;acc[key] ||= {kind:p.kind,status:p.status,count:0};acc[key].count++;return acc;},{})), upcomingMilestones: rows.programs.filter(p=>p.milestone_date), attentionTasks: rows.tasks.filter(t=>t.status!=='Done'), staffPerformance: role==='member' ? [{id:profile.id,name:profile.name,programs:rows.programs.filter(p=>p.assignee_ids?.includes(profile.id)),assignedTasks:rows.tasks.filter(t=>t.assignee_id===profile.id).length,completedTasks:rows.tasks.filter(t=>t.assignee_id===profile.id&&t.status==='Done').length,reviewTasks:0,overdueTasks:0,updatesLast30Days:progressUpdates,lastUpdate:null}] : [], summary: {...summary,recordedPrograms:rows.programs.filter(p=>p.progress!=null).length,totalPrograms:rows.programs.length,completedPrograms:rows.programs.filter(p=>p.status==='Completed').length,completedTasks:rows.tasks.filter(t=>t.status==='Done').length,pendingTasks:rows.tasks.filter(t=>t.status!=='Done').length}, monthly: [{ month: 10, income: 0, expense: 0 }], inventory: [{ status: 'Available', quantity: 3 }], upcomingPrograms: [] });

  if (path === 'profiles/me') {
   if (failProfile) return reply('Profile unavailable', 503);
   profile = { ...profile, name: req.postDataJSON().name }; return reply(profile);
  }
  if (path.startsWith('events') && req.method() !== 'GET' && failEvent) return reply('Event unavailable',503);
  if (path.endsWith('/progress') && req.method()==='PUT') { if(failProgress) return reply('Progress unavailable',503); const id=path.split('/')[1]; const row=rows.programs.find(p=>p.id===id); if(role==='member'&&!row?.assignee_ids?.includes(profile.id)) return reply('Forbidden',403); Object.assign(row,req.postDataJSON());progressUpdates++;return reply(row); }
  const [resource, id] = path.split('/');
  if (req.method() === 'GET') {
   let records = resource === 'profiles' ? [profile,...extraProfiles] : rows[resource] || [];
   const q = url.searchParams.get('q')?.toLowerCase();
   if(q) records = records.filter(row => Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
   for(const key of ['status','kind','priority','permit_status','type','departmentRole']) { const value=url.searchParams.get(key); if(value) records=records.filter(row=>row[key]===value); }
   const size=Number(url.searchParams.get('size')||50), index=Number(url.searchParams.get('page')||0)*size;
   return reply(records.slice(index,index+size),200,{hasMore:records.length>index+size});
  }
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
 await expect(page.getByRole('link', { name: 'Kelola', exact: true })).toBeVisible();
 await expect(page.locator('.swimmer, .bubble')).toHaveCount(0);
 await page.getByRole('link', { name: 'Tim', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Tim Departemen' })).toBeVisible();
 await page.getByLabel('Filter role').selectOption('staff');
 await expect(page.getByText('Belum ada data.', {exact:true})).toBeVisible();
 await page.getByLabel('Filter role').selectOption('bph');
 await expect(page.locator('.member-list .badge')).toHaveText('BPH');
 await page.getByLabel('Cari anggota').fill('not-present');
 await expect(page.getByText('Belum ada data.', {exact:true})).toBeVisible();
});
test('Staff cannot operate another person\'s task and has no management controls', async ({ page }) => {
 const mock = await mockApi(page, 'member');
 mock.rows.tasks.push({ id: 'other-task', title: 'Other assignment', description: '', status: 'To Do', priority: 'Low', created_by: 'other-user', assignee_id: 'other-user', due_date: null });
 await login(page);
 await expect(page.locator('.profile small')).toHaveText('Staff');
 await expect(page.getByRole('link', { name: 'Kelola', exact: true })).toHaveCount(0);
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
 const palette = await page.evaluate(() => { const css = getComputedStyle(document.documentElement); return ['--background','--blue','--red'].map(key => css.getPropertyValue(key).trim()); });
 expect(palette).toEqual(['#0B1426','#2563EB','#DC2626']);
 await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
 await expect(page.locator('.sidebar')).toHaveClass(/collapsed/);
 await page.getByRole('button', { name: 'Perluas navigasi' }).click();
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
 await expect(page.locator('.program-chart-rows .chart-missing')).toHaveCount(2);
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
 await page.reload();await row.getByRole('button',{name:'Detail',exact:true}).click();await expect(page.getByText('Two practice sessions recorded')).toBeVisible();await page.keyboard.press('Escape');
 mock.failProgress();await row.getByRole('button',{name:'Update progres'}).click();
 await page.getByLabel('Progress (%)',{exact:true}).fill('70');await page.getByRole('button',{name:'Simpan',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('Progress unavailable');await page.getByRole('button',{name:'Batal',exact:true}).click();
 await expect(row.getByText('35%')).toBeVisible();
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();
 await page.getByRole('button',{name:'UKOR',exact:true}).click();
 await expect(page.getByLabel('Shared sports unit: 35%',{exact:true})).toBeVisible();
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
 await expect(row.getByText('UKOR',{exact:true})).toBeVisible();await expect(row.getByText('Belum diisi')).toHaveCount(1);
 expect(mock.rows.programs[0].assignee_ids).toHaveLength(2);
 await row.getByRole('button',{name:'Update progres'}).click();await expect(page.getByLabel('Progress (%)',{exact:true})).toHaveValue('');
});

test('KPI charts distinguish unknown progress from zero and switch Staff metrics',async ({page})=>{
 const mock=await mockApi(page,'member');
 mock.rows.programs.push(
  {id:'unknown',name:'Unknown activity',kind:'Proker',status:'Unspecified',progress:null,assignee_ids:[user.id]},
  {id:'zero',name:'Zero activity',kind:'Proker',status:'Ongoing',progress:0,assignee_ids:[user.id]},
  {id:'done',name:'Completed activity',kind:'UKOR',status:'Completed',progress:100,assignee_ids:[user.id]},
 );
 await login(page);
 await expect(page.getByLabel('Unknown activity: belum diisi',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Zero activity: 0%',{exact:true})).toBeVisible();
 await expect(page.locator('.program-chart-rows .chart-missing')).toHaveCount(1);
 await expect(page.locator('.kpi').filter({hasText:'Progres tercatat'})).toContainText('2 / 3');
 await expect(page.getByLabel('Development Staff: 1 selesai, 1 berjalan, 1 belum diisi',{exact:true})).toBeVisible();
 await page.getByLabel('Metrik Staff').selectOption('tasks');
 await expect(page.getByLabel('Development Staff: 0 dari 1 tugas selesai',{exact:true})).toBeVisible();
 await page.getByLabel('Metrik Staff').selectOption('updates');
 await expect(page.getByLabel('Development Staff: 0 pembaruan dalam 30 hari',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'UKOR',exact:true}).click();
 await expect(page.getByLabel('Completed activity: 100%',{exact:true})).toBeVisible();
 await expect(page.locator('.program-focus-list, .staff-performance, .follow-up-list')).toHaveCount(0);
});

test('long program and task descriptions stay inside a bounded mobile detail dialog',async ({page})=>{
 await page.setViewportSize({width:375,height:812});
 const mock=await mockApi(page,'member');const description='Complete activity description. '+('Long source material. '.repeat(70));const notes='Full progress notes. '+('Additional detail. '.repeat(70));
 mock.rows.programs.push({id:'long',name:'Long activity',kind:'Proker',status:'Ongoing',progress:null,description,progress_notes:notes,pic:'Development Staff',assignee_ids:[user.id]});
 mock.rows.tasks[0].description=description;
 await login(page);await page.getByRole('button',{name:'Buka navigasi'}).click();await page.getByRole('link',{name:'Program',exact:true}).click();
 await expect(page.getByText(description,{exact:true})).toHaveCount(0);await expect(page.getByText(notes,{exact:true})).toHaveCount(0);
 const detail=page.getByRole('button',{name:'Detail',exact:true});await detail.click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByText(description,{exact:true})).toBeVisible();
 const rect=await dialog.boundingBox();expect(rect.height).toBeLessThanOrEqual(812*.85);expect(rect.x+rect.width).toBeLessThanOrEqual(375);
 expect(await dialog.locator('.detail-body').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await page.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'Tutup'})).toBeFocused();await page.keyboard.press('Tab');await expect(dialog.getByRole('region',{name:'Isi detail'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(detail).toBeFocused();
 await page.getByRole('button',{name:'Buka navigasi'}).click();await page.getByRole('link',{name:'Tugas',exact:true}).click();
 await expect(page.getByText(description,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Detail',exact:true}).click();await expect(page.getByRole('dialog').getByText(description,{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('search finds records beyond 100, resets pages and keeps exact end pagination', async ({page}) => {
 const mock=await mockApi(page);
 for(let n=0;n<125;n++) mock.rows.programs.push({id:`p-${n}`,name:n===124?'Target 100%_* (a+)+$':'Activity '+n,kind:n%2?'UKOR':'Proker',status:'Planning',progress:null,pic:'Test'});
 await login(page); await page.getByRole('link',{name:'Program',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(10);
 await page.getByRole('button',{name:'Berikutnya'}).click();await expect(page.locator('.pagination')).toContainText('Halaman 2');
 await page.getByLabel('Cari program').fill('Target 100%_* (a+)+$');
 await expect(page.getByRole('cell',{name:'Target 100%_* (a+)+$'})).toBeVisible();
 await expect(page.locator('.pagination')).toContainText('Halaman 1');await expect(page.getByRole('button',{name:'Berikutnya'})).toBeDisabled();
 await page.getByLabel('Cari program').fill('');await page.getByLabel('Filter jenis kegiatan').selectOption('UKOR');
 await expect(page.locator('tbody tr')).toHaveCount(10);await expect(page.locator('tbody')).not.toContainText('Proker');
});

for (const width of [375,768,1440]) test(`populated dashboard fits ${width}px with global metrics beyond preview`,async ({page},testInfo)=>{
 await page.setViewportSize({width,height:900});const mock=await mockApi(page,'member');
 for(let n=0;n<35;n++)mock.rows.programs.push({id:`c-${n}`,name:`Activity ${n}`,kind:n%2?'Proker':'UKOR',status:n===34?'Completed':'Ongoing',progress:n===34?100:null,assignee_ids:n===34?[user.id]:[]});
 await login(page);await expect(page.locator('.kpi').filter({hasText:'Progres tercatat'})).toContainText('1 / 35');
 await expect(page.getByLabel('Development Staff: 1 selesai',{exact:true})).toBeVisible();
 const chart=page.getByRole('region',{name:'Data grafik kegiatan'});expect((await chart.boundingBox()).height).toBeLessThanOrEqual(320);await chart.focus();await expect(chart).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath(`dashboard-${width}.png`),fullPage:true});
});

test('failed global search reports error, retains query and recovers on retry',async ({page})=>{
 const mock=await mockApi(page);mock.rows.events.push({id:'e1',name:'Find venue',venue:'Court',status:'Planning',permit_status:'Pending'});
 await login(page);await page.getByRole('link',{name:'Kegiatan',exact:true}).click();
 await page.route('**/api/events?**',route=>route.fulfill({status:503,json:{error:{message:'Search unavailable'}}}));
 await page.getByLabel('Cari kegiatan').fill('Court');await expect(page.getByRole('alert')).toContainText('Search unavailable');await expect(page.getByLabel('Cari kegiatan')).toHaveValue('Court');
 await page.unroute('**/api/events?**');await page.getByRole('button',{name:'Coba kembali'}).click();await expect(page.getByRole('cell',{name:'Find venue'})).toBeVisible();
});


for(const width of [375,768,1440]) test(`reference composition and readable bars at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});const mock=await mockApi(page,'member');
 for(let n=0;n<14;n++)mock.rows.programs.push({id:`visual-${n}`,name:`${n<5?'Program':'UKOR'} ${n+1}`,kind:n<5?'Proker':'UKOR',status:n===0?'Completed':n===4?'Unspecified':'Ongoing',progress:n===0?100:n===4?null:Math.min(90,n*15),pic:'Assigned team',assignee_ids:[user.id]});
 await login(page);await expect(page.getByLabel('Program 1: 100%',{exact:true})).toBeVisible();
 const metrics=await page.locator('.kpi-grid').boundingBox(),bars=await page.locator('.program-chart-card').boundingBox();
 if(width>600){expect(bars.x).toBeGreaterThan(metrics.x+metrics.width-1);expect(Math.abs(metrics.y-bars.y)).toBeLessThan(2);}else expect(bars.y).toBeGreaterThan(metrics.y+metrics.height-1);
 const track=await page.locator('.program-column .chart-track').first().boundingBox(),top=await page.locator('.percent-axis span').first().boundingBox(),bottom=await page.locator('.percent-axis span').last().boundingBox();
 expect(Math.abs(top.y+top.height/2-track.y)).toBeLessThan(3);expect(Math.abs(bottom.y+bottom.height/2-track.y-track.height)).toBeLessThan(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath(`reference-dashboard-${width}.png`),fullPage:true});
 await page.goto('/login');await page.getByRole('button',{name:'Logout',exact:true}).click();await expect(page.getByRole('heading',{name:'Masuk ke akun'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`reference-login-${width}.png`),fullPage:true});
});

function contrast(a,b) {
 const luminance=rgb=>rgb.match(/[\d.]+/g).slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const [dark,light]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (light+.05)/(dark+.05);
}
test('brand and semantic status colors keep rendered text, controls and charts readable',async({page})=>{
 const mock=await mockApi(page,'member');
 for(const [n,status]of ['Completed','Ongoing','Planning','Unspecified','Cancelled'].entries())mock.rows.programs.push({id:`color-${n}`,name:`Color activity ${n}`,kind:'Proker',status,progress:n===3?null:n===0?100:25,assignee_ids:[user.id]});
 await login(page);
 const pairs=await page.evaluate(()=>{
  const css=selector=>getComputedStyle(document.querySelector(selector));
  const text=selector=>({name:selector,fg:css(selector).color,bg:css(selector).backgroundColor});
  const panel=css('.staff-chart-card').backgroundColor;
  return {
   text:[text('.sidebar a.active'),text('.kpi-featured'),text('.kind-tabs button[aria-pressed="true"]'),...['done','running','planned','unknown','cancelled'].map(key=>text(`.staff-chart-rows .chart-${key}`))],
   secondary:{name:'chart label',fg:css('.program-column .chart-label').color,bg:css('.program-chart-card').backgroundColor},
   graphic:['done','running','planned','unknown','cancelled'].map(key=>({name:key,fg:css(`.donut-${key}`).stroke,bg:panel}))
  };
 });
 for(const pair of [...pairs.text,pairs.secondary])expect(contrast(pair.fg,pair.bg),pair.name).toBeGreaterThanOrEqual(4.5);
 for(const pair of pairs.graphic)expect(contrast(pair.fg,pair.bg),pair.name).toBeGreaterThanOrEqual(3);
 expect(pairs.graphic.map(p=>p.fg)).toEqual(['rgb(74, 222, 128)','rgb(96, 165, 250)','rgb(250, 204, 21)','rgb(148, 163, 184)','rgb(248, 113, 113)']);
 for(const [n,key]of ['done','running','planned','unknown','cancelled'].entries())await expect(page.getByLabel(`Color activity ${n}: ${n===3?'belum diisi':n===0?'100%':'25%'}`,{exact:true}).locator(`.chart-${key}`)).toHaveCount(1);
 await page.getByRole('link',{name:'Keuangan',exact:true}).click();await expect(page.locator('.recharts-responsive-container')).toBeVisible();
 const legend=await page.locator('.chart-legend i').evaluateAll(els=>els.map(el=>getComputedStyle(el).borderTopColor));expect(legend).toEqual(['rgb(96, 165, 250)','rgb(255, 90, 90)']);
 await page.getByRole('button',{name:'Logout',exact:true}).click();await expect(page.getByRole('heading',{name:'Masuk ke akun'})).toBeVisible();
 const loginColors=await page.evaluate(()=>{const btn=getComputedStyle(document.querySelector('.login-card .primary'));const input=document.querySelector('.login-card input');return {button:[btn.color,btn.backgroundColor],placeholder:[getComputedStyle(input,'::placeholder').color,getComputedStyle(input).backgroundColor]};});
 expect(contrast(...loginColors.button)).toBeGreaterThanOrEqual(4.5);expect(contrast(...loginColors.placeholder)).toBeGreaterThanOrEqual(4.5);
});
