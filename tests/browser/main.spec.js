import { test, expect } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', name: 'Development Staff', role: 'staff' };
const summary = { activePrograms: 1, totalPrograms: 1, completedPrograms: 0, pendingTasks: 1, completedTasks: 0, budget: 1000000, income: 0, expense: 0, remaining: 1000000, totalAssets: 3, budgetUtilization: 0 };
async function mockApi(page, role = 'staff') {
 let signedIn = false; const counts = {}; const extraProfiles=[];
 let profile = { ...user, role, departmentRole: role === 'member' ? 'staff' : 'bph' };
 let failEvent = false; let failProfile = false; let failPhoto = false; let failPassword = false;
 const rows = { events: [], programs: [], finances: [], inventory: [], tasks: [{ id: 'task-id', title: 'Review proposal', description: '', status: 'To Do', priority: 'Medium', program_id: 'task-program', assignee_id: user.id, due_date: null, created_by: user.id }] };
 const notes = []; const milestones = []; const timeline = [];
 let failAvatarDirectory = false;
 let failTask = false; let failProgress = false; let progressUpdates = 0;
 await page.route('**/api/**', async route => {
  const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/', '');
  const key = req.method() + ' ' + path; counts[key] = (counts[key] || 0) + 1;
  const reply = (data, status = 200, meta) => route.fulfill({ status, json: status >= 400 ? { error: { message: data } } : { data, meta } });
  if (path === 'auth/refresh') return signedIn ? reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }) : reply('Session expired', 401);
  if (path === 'auth/login') { signedIn = true; return reply({ accessToken: 'development-token', user: profile, expiresIn: 3600 }); }
  if (path === 'auth/logout') { signedIn = false; return reply({ loggedOut: true }); }
  if (path === 'dashboard'||path==='dashboard/overview') return reply({ overview: {proker: rows.programs.filter(p=>p.kind==='Proker').length, ukor: rows.programs.filter(p=>p.kind==='UKOR').length, openTasks: rows.tasks.filter(t=>t.status!=='Done').length, overdueTasks:0}, programFocus: rows.programs.slice(0,30), programStatusCounts: Object.values(rows.programs.reduce((acc,p)=>{const key=p.kind+p.status;acc[key] ||= {kind:p.kind,status:p.status,count:0};acc[key].count++;return acc;},{})), upcomingMilestones: rows.programs.filter(p=>p.milestone_date), attentionTasks: rows.tasks.filter(t=>t.status!=='Done'), staffPerformance: role==='member' ? [{id:profile.id,name:profile.name,programs:rows.programs.filter(p=>p.assignee_ids?.includes(profile.id)),assignedTasks:rows.tasks.filter(t=>t.assignee_id===profile.id).length,completedTasks:rows.tasks.filter(t=>t.assignee_id===profile.id&&t.status==='Done').length,reviewTasks:0,overdueTasks:0,updatesLast30Days:progressUpdates,lastUpdate:null}] : [], summary: {...summary,recordedPrograms:rows.programs.filter(p=>p.progress!=null).length,totalPrograms:rows.programs.length,completedPrograms:rows.programs.filter(p=>p.status==='Completed').length,completedTasks:rows.tasks.filter(t=>t.status==='Done').length,pendingTasks:rows.tasks.filter(t=>t.status!=='Done').length}, monthly: [{ month: 10, income: 0, expense: 0 }], inventory: [{ status: 'Available', quantity: 3 }], upcomingPrograms: [] });

  function filteredTasks() {
   let records=rows.tasks;
   const q=url.searchParams.get('q')?.toLowerCase();if(q) records=records.filter(t=>(t.title+' '+(t.description||'')).toLowerCase().includes(q));
   for(const key of ['program_id','assignee_id','priority','status']){const value=url.searchParams.get(key);if(value)records=records.filter(t=>t[key]===value);}
   const programScope=url.searchParams.get('program_scope');if(programScope==='unlinked')records=records.filter(t=>!t.program_id);if(programScope==='linked')records=records.filter(t=>t.program_id);
   const scope=url.searchParams.get('scope');
   if(scope==='mine')records=records.filter(t=>t.assignee_id===profile.id);
   if(scope==='unassigned')records=records.filter(t=>!t.assignee_id);
   if(scope==='overdue')records=records.filter(t=>t.status!=='Done'&&t.due_date&&t.due_date<'2026-10-19');
   return records;
  }
  if(/^tasks\/[^/]+$/.test(path)&&!['tasks/board','tasks/summary'].includes(path)&&req.method()==='GET') {
   const task=rows.tasks.find(t=>t.id===path.split('/')[1]);return task?reply(task):reply('Tugas tidak ditemukan.',404);
  }
  if(path==='directory')return reply({profiles:[profile,...extraProfiles],programs:rows.programs.filter(p=>role!=='member'||p.assignee_ids?.includes(profile.id)).map(({id,name,kind,assignee_ids})=>({id,name,kind,assignee_ids}))});
  if(path==='tasks/summary'||path==='tasks/board') {
   const tasks=filteredTasks();const statuses={};const workload={};
   for(const t of tasks){statuses[t.status]=(statuses[t.status]||0)+1;const id=t.assignee_id||'unassigned';workload[id] ||= {assignee_id:t.assignee_id||null,total:0,done:0,open:0,overdue:0};const w=workload[id];w.total++;t.status==='Done'?w.done++:w.open++;if(t.status!=='Done'&&t.due_date&&t.due_date<'2026-10-19')w.overdue++;}
   const summary={unlinked:tasks.filter(t=>!t.program_id).length,total:tasks.length,done:tasks.filter(t=>t.status==='Done').length,overdue:tasks.filter(t=>t.status!=='Done'&&t.due_date&&t.due_date<'2026-10-19').length,unassigned:tasks.filter(t=>!t.assignee_id).length,statuses,workload:role==='member'?[]:Object.values(workload)};
   if(path==='tasks/summary')return reply(summary);
   const pages=(url.searchParams.get('pages')||'0,0,0,0,0').split(',').map(Number);
   return reply({summary,columns:Object.fromEntries(['Backlog','To Do','In Progress','Review','Done'].map((status,i)=>{const records=tasks.filter(t=>t.status===status),index=pages[i]*12;return[status,{items:records.slice(index,index+12).map(t=>{const row={...t};delete row.description;return row;}),hasMore:records.length>index+12}];}))});
  }
  if(/^programs\/[^/]+/.test(path)) {
   const [,programId,child,childId]=path.split('/'); const program=rows.programs.find(p=>p.id===programId);
   if(!program || (role==='member'&&!program.assignee_ids?.includes(profile.id)))return reply('Program tidak ditemukan atau akses tidak tersedia.',404);
   if(!child&&req.method()==='GET')return reply(program);
   if(child==='timeline') {const all=timeline.filter(t=>t.program_id===programId);const index=Number(url.searchParams.get('page')||0)*20;return reply({items:all.slice(index,index+20),hasMore:all.length>index+20});}
   if(child==='notes'&&req.method()==='POST') {const note={id:'note-'+notes.length,program_id:programId,actor_id:profile.id,kind:'note',body:req.postDataJSON().body,created_at:new Date().toISOString()};notes.push(note);timeline.unshift(note);return reply(note,201);}
   if(child==='milestones') {
    if(req.method()==='GET'){const all=milestones.filter(m=>m.program_id===programId&&(!url.searchParams.get('status')||m.status===url.searchParams.get('status')));return reply(all,200,{hasMore:false});}
    if(req.method()==='POST'){const m={...req.postDataJSON(),id:'m-'+milestones.length,program_id:programId};milestones.push(m);return reply(m,201);}
    const m=milestones.find(m=>m.id===childId&&m.program_id===programId);if(!m)return reply('Not found',404);
    if(req.method()==='PUT'){Object.assign(m,req.postDataJSON());return reply(m);}
    if(req.method()==='DELETE'){milestones.splice(milestones.indexOf(m),1);return reply({deleted:true});}
   }
  }
  if(path==='profiles/avatars') {
   if(failAvatarDirectory)return reply('Foto tim belum dapat dimuat.',503);
   const ids=(url.searchParams.get('ids')||'').split(',');
   return reply(Object.fromEntries([profile,...extraProfiles].filter(p=>p.avatar_path && ids.includes(p.id)).map(p=>[p.id,{path:p.avatar_path,url:p.testPhotoUrl||'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDk0AAAAASUVORK5CYII='}])));
  }
  if(path==='auth/password') {
   if(failPassword || req.postDataJSON().currentPassword!=='old-test-password')return reply('Password saat ini tidak sesuai.',400);
   return reply({accessToken:'new-test-session',expiresIn:3600,user:profile,passwordChanged:true});
  }
  if(path==='profiles/me/avatar') {
   if(req.method()==='GET')return reply({available:Boolean(profile.avatar_path),url:profile.avatar_path?'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDk0AAAAASUVORK5CYII=':undefined,expiresIn:900});
   if(failPhoto)return reply('Foto gagal disimpan.',503);
   profile={...profile,avatar_path:req.method()==='DELETE'?null:`${profile.id}/00000000-0000-0000-0000-000000000009.jpg`};return reply(profile);
  }
  if (path === 'profiles/me') {
   if (failProfile) return reply('Profile unavailable', 503);
   profile = { ...profile, name: req.postDataJSON().name }; return reply(profile);
  }
  if (path.startsWith('events') && req.method() !== 'GET' && failEvent) return reply('Event unavailable',503);
  if (path.endsWith('/progress') && req.method()==='PUT') { if(failProgress) return reply('Progress unavailable',503); const id=path.split('/')[1]; const row=rows.programs.find(p=>p.id===id); if(role==='member'&&!row?.assignee_ids?.includes(profile.id)) return reply('Forbidden',403); Object.assign(row,req.postDataJSON());progressUpdates++;timeline.unshift({id:'update-'+progressUpdates,program_id:id,actor_id:profile.id,kind:'progress',status:row.status,progress:row.progress,body:row.progress_notes,created_at:new Date().toISOString()});return reply(row); }
  const [resource, id] = path.split('/');
  if (req.method() === 'GET') {
   let records = resource === 'profiles' ? [profile,...extraProfiles] : resource === 'tasks' ? filteredTasks() : rows[resource] || [];
   const q = url.searchParams.get('q')?.toLowerCase();
   if(q) records = records.filter(row => Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
   for(const key of ['status','kind','priority','permit_status','type','departmentRole']) { const value=url.searchParams.get(key); if(value) records=records.filter(row=>resource==='programs'&&key==='status'&&value==='Ongoing'?['Ongoing','Active'].includes(row.status):row[key]===value); }
   const size=Number(url.searchParams.get('size')||50), index=Number(url.searchParams.get('page')||0)*size;
   return reply(records.slice(index,index+size),200,{hasMore:records.length>index+size});
  }
  if (req.method() === 'PUT' && resource === 'tasks' && failTask) return reply('Database unavailable', 503);
  if(resource==='tasks' && (req.method()==='POST'||(req.method()==='PUT'&&path.split('/').length===2)) && !req.postDataJSON().program_id)return reply('Pilih Proker/UKOR untuk tugas ini.',400);
  if (req.method() === 'POST') { const data = { ...req.postDataJSON(), id: `${resource}-id`, created_by: user.id };rows[resource].push(data);return reply(data,201); }
  if (req.method() === 'PUT') { const data = { ...rows[resource].find(row => row.id === id), ...req.postDataJSON() };rows[resource] = rows[resource].map(row => row.id === id ? data : row);return reply(data); }
  if (req.method() === 'DELETE') { rows[resource] = rows[resource].filter(row => row.id !== id);return reply({ deleted: true }); }
  return reply('Not found',404);
 });
 return { failAvatarDirectory(){failAvatarDirectory=true;}, failPhoto(){failPhoto=true;}, failPassword(){failPassword=true;}, failEvent() { failEvent = true; }, failProfile() { failProfile = true; }, failTask() { failTask = true; }, failProgress() { failProgress=true; }, profiles:extraProfiles, rows, counts, notes, milestones, timeline };
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
 await page.getByLabel('Akun PJ', { exact: true }).selectOption(user.id);
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: 'Development Tournament' })).toBeVisible();
 await page.getByRole('button', { name: 'Edit', exact: true }).click();
 await page.getByLabel('Status', { exact: true }).selectOption('Completed');
 await page.getByRole('button', { name: 'Simpan', exact: true }).click();
 await expect(page.getByRole('cell', { name: /Finished/ })).toBeVisible();
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
 const mock=await mockApi(page,'member'); mock.rows.programs.push({id:'task-program',name:'Development Proker',kind:'Proker',status:'Planning',assignee_ids:[user.id]}); await login(page);
 await page.getByRole('link', { name: 'Program', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Tambah program' })).toHaveCount(0);
 await page.getByRole('link', { name: 'Tugas', exact: true }).click();
 await page.getByRole('button', { name: 'Tambah tugas', exact: true }).click();
 await page.getByLabel('Judul').fill('Member task');
 await page.getByRole('dialog').getByLabel('Program',{exact:true}).selectOption('task-program');
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
 await page.getByLabel('Akun PJ', { exact: true }).selectOption(user.id);
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
 await page.reload();await row.getByRole('link',{name:'Buka program',exact:true}).click();await expect(page.getByText('Two practice sessions recorded')).toBeVisible();await page.getByRole('link',{name:'Semua program',exact:true}).click();
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
 await page.getByLabel('Nama',{exact:true}).fill('Multi PJ activity');await page.getByLabel('Akun PJ',{exact:true}).selectOption(user.id);
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
 await expect(page.getByLabel('Development Staff: 1 finished, 1 on going, 1 belum diisi',{exact:true})).toBeVisible();
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
 await page.getByRole('link',{name:'Buka program',exact:true}).click();
 const detail=page.getByRole('button',{name:'Detail program',exact:true});await detail.click();
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
 await expect(page.getByLabel('Development Staff: 1 finished',{exact:true})).toBeVisible();
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
 await expect(page.getByLabel('Color activity 0: 100%',{exact:true})).toBeVisible();
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

test('PJ program workspace persists notes, agenda and scoped tasks; direct other-program link is denied',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});const mock=await mockApi(page,'member');
 mock.rows.programs.push({id:'pj-workspace',name:'Sports development program',kind:'UKOR',status:'Ongoing',progress:30,description:'Training and preparation. '.repeat(60),progress_notes:'Selection in progress',assignee_ids:[user.id],pic:'Development Staff',next_milestone:'Selection',milestone_date:'2026-10-31'});
 mock.rows.programs.push({id:'closed',name:'Closed program',kind:'Proker',status:'Planning',assignee_ids:['other']});
 await login(page);await page.goto('/programs/pj-workspace');await expect(page.getByRole('heading',{name:'Sports development program',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Kelola program & PJ'})).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath('program-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Timeline',exact:true}).click();await page.getByLabel('Pembaruan program').fill('Venue confirmed; prepare the selection form.');await page.getByRole('button',{name:'Kirim pembaruan'}).click();
 await expect(page.locator('.activity-list')).toContainText('Venue confirmed');expect(mock.notes).toHaveLength(1);
 await page.getByRole('button',{name:'Agenda',exact:true}).click();await page.getByRole('button',{name:'Tambah agenda'}).click();await page.getByLabel('Judul agenda').fill('Internal selection');await page.getByLabel('Tanggal agenda').fill('2026-10-25');await page.getByRole('button',{name:'Simpan',exact:true}).click();
 await page.getByRole('button',{name:'Selesaikan Internal selection'}).click();await expect(page.getByRole('button',{name:'Buka kembali Internal selection'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Tugas',exact:true}).click();await expect(page.getByRole('heading',{name:'Review proposal'})).toHaveCount(0);await page.getByRole('button',{name:'Tugas baru'}).click();
 await expect(page.getByRole('dialog').getByLabel('Program',{exact:true})).toHaveCount(0);await page.getByLabel('Judul').fill('Prepare selection form');await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.getByRole('heading',{name:'Prepare selection form'})).toBeVisible();
 expect(mock.rows.tasks.find(t=>t.title==='Prepare selection form').program_id).toBe('pj-workspace');
 await page.getByLabel('Status Prepare selection form').selectOption('Done');await expect(page.getByLabel('Status Prepare selection form')).toHaveValue('Done');await page.reload();await page.getByRole('button',{name:'Agenda',exact:true}).click();await expect(page.getByRole('button',{name:'Buka kembali Internal selection'})).toHaveAttribute('aria-pressed','true');
 await page.goto('/programs/closed');await expect(page.getByRole('alert')).toContainText('akses tidak tersedia');await expect(page.getByRole('button',{name:'Update progres'})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Closed program'})).toHaveCount(0);
});
for(const width of [375,1440])test(`BPH task board tracks full totals, per-column pages, account filters and drag/drop at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});const mock=await mockApi(page);mock.rows.tasks=[];mock.profiles.push({id:'second-staff',name:'Second Staff',role:'member',departmentRole:'staff'});
 for(let n=0;n<125;n++)mock.rows.tasks.push({id:'track-'+n,title:n===124?'Find beyond page 100':'Task '+n,description:'Work item',status:'To Do',priority:n%2?'High':'Low',assignee_id:n%2?'second-staff':user.id,created_by:user.id,program_id:null,due_date:n===124?'2020-01-01':null});
 await login(page);await page.goto('/tasks');await expect(page.getByRole('button',{name:'Total tugas 125'})).toBeVisible();await expect(page.locator('.work-task')).toHaveCount(12);
 await expect(page.getByRole('region',{name:'Perlu dikerjakan',exact:true}).locator('.column-count')).toHaveText('125');
 await page.getByRole('button',{name:'Berikutnya Perlu dikerjakan'}).click();await expect(page.getByRole('heading',{name:'Task 12',exact:true})).toBeVisible();
 await page.getByLabel('Cari tugas').fill('Find beyond page 100');await expect(page.getByRole('heading',{name:'Find beyond page 100'})).toBeVisible();await expect(page.getByRole('button',{name:'Total tugas 1',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reset filter'}).click();await expect(page.getByRole('heading',{name:'Task 0',exact:true})).toBeVisible();
 await page.getByText('Beban tugas per akun',{exact:false}).first().click();await expect(page.locator('.workload-grid')).toContainText('Second Staff');await page.getByLabel('Filter akun PJ').selectOption('second-staff');await expect(page.getByRole('button',{name:'Total tugas 62'})).toBeVisible();
 await page.getByRole('button',{name:'Daftar',exact:true}).click();await expect(page.locator('.task-list-view tbody tr')).toHaveCount(20);await expect(page.locator('.task-list-view tbody')).not.toContainText('Development Staff');
 await page.getByRole('button',{name:'Reset filter'}).click();await page.getByRole('button',{name:'Papan',exact:true}).click();await expect(page.getByRole('heading',{name:'Task 0',exact:true})).toBeVisible();
 if(width===1440){await page.locator('.work-task').filter({has:page.getByRole('heading',{name:'Task 0',exact:true})}).locator('.task-drag-handle').dragTo(page.getByRole('region',{name:'Dikerjakan',exact:true}));await expect(page.getByLabel('Status Task 0',{exact:true})).toHaveValue('In Progress');}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`tasks-${width}.png`),fullPage:true});
});
test('mobile program workspace and agenda retain bounded content without overflow',async({page},testInfo)=>{
 await page.setViewportSize({width:375,height:812});const mock=await mockApi(page);mock.rows.programs.push({id:'mobile-unit',name:'A very long sports program name for the department',kind:'UKOR',status:'Ongoing',progress:null,description:'Long description '.repeat(100),assignee_ids:[user.id],pic:'Development Staff'});
 await login(page);await page.goto('/programs/mobile-unit');await expect(page.getByRole('heading',{name:'A very long sports program name for the department',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('program-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Agenda',exact:true}).click();await page.getByRole('button',{name:'Tambah agenda'}).click();await page.getByLabel('Judul agenda').fill('Pending date');await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.locator('.milestone-list')).toContainText('Pending date');expect(mock.milestones[0].due_date).toBe(null);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('manual refresh loads external task changes and removes a revoked program workspace',async({page})=>{
 const mock=await mockApi(page,'member');mock.rows.programs.push({id:'revoked-unit',name:'Revocable unit',kind:'UKOR',status:'Active',progress:null,assignee_ids:[user.id],pic:'Development Staff'});
 await login(page);await page.goto('/tasks');await expect(page.getByLabel('Status Review proposal')).toHaveValue('To Do');mock.rows.tasks[0].status='Review';
 await page.getByRole('button',{name:'Muat ulang tugas'}).click();await expect(page.getByLabel('Status Review proposal')).toHaveValue('Review');expect(mock.counts['PUT tasks/task-id/status']).toBeUndefined();
 await page.goto('/programs/revoked-unit');await expect(page.getByRole('heading',{name:'Revocable unit',exact:true})).toBeVisible();mock.rows.programs[0].assignee_ids=[];
 await page.getByRole('button',{name:'Muat ulang program'}).click();await expect(page.getByRole('alert')).toContainText('akses tidak tersedia');await expect(page.getByRole('button',{name:'Update progres'})).toHaveCount(0);
});

const photoFixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDk0AAAAASUVORK5CYII=','base64');
for(const width of [375,1440])test(`own photo preview, upload, reload and removal at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});const mock=await mockApi(page,'member');await login(page);await page.goto('/settings');
 await page.getByLabel('Pilih foto profil').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:photoFixture});await expect(page.getByRole('img',{name:'Pratinjau foto profil'})).toBeVisible();expect(mock.counts['PUT profiles/me/avatar']).toBeUndefined();
 await page.getByRole('button',{name:'Simpan foto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Foto profil diperbarui.');await expect(page.locator('.topbar img[alt="Foto profil"]')).toBeVisible();
 await page.reload();await expect(page.locator('.photo-preview img[alt="Foto profil"]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`settings-${width}.png`),fullPage:true});
 await page.getByRole('button',{name:'Hapus foto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Foto profil dihapus.');await expect(page.locator('.topbar img')).toHaveCount(0);
});
test('photo validation and failed storage retain the selected preview without publishing a photo',async({page})=>{
 const mock=await mockApi(page);await login(page);await page.goto('/settings');
 await page.getByLabel('Pilih foto profil').setInputFiles({name:'avatar.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await expect(page.getByRole('alert')).toContainText('JPG, PNG, atau WebP');expect(mock.counts['PUT profiles/me/avatar']).toBeUndefined();
 await page.getByLabel('Pilih foto profil').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:photoFixture});await expect(page.getByRole('img',{name:'Pratinjau foto profil'})).toBeVisible();mock.failPhoto();await page.getByRole('button',{name:'Simpan foto',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Foto gagal disimpan');await expect(page.getByRole('img',{name:'Pratinjau foto profil'})).toBeVisible();await expect(page.locator('.topbar img')).toHaveCount(0);await expect(page.getByRole('button',{name:'Simpan foto',exact:true})).toBeEnabled();
});
test('password confirmation, current-password failure and successful fresh session',async({page})=>{
 const mock=await mockApi(page,'member');await login(page);await page.goto('/settings');
 await page.getByLabel('Password saat ini',{exact:true}).fill('wrong-test-password');await page.getByLabel('Password baru',{exact:true}).fill('updated-test-password');await page.getByLabel('Konfirmasi password baru',{exact:true}).fill('different-test-password');await page.getByRole('button',{name:'Ganti password',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Konfirmasi password');expect(mock.counts['POST auth/password']).toBeUndefined();
 await page.getByLabel('Konfirmasi password baru',{exact:true}).fill('updated-test-password');await page.getByRole('button',{name:'Ganti password',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Password saat ini tidak sesuai');await expect(page.getByLabel('Password baru',{exact:true})).toHaveValue('updated-test-password');await expect(page.locator('.profile small')).toHaveText('Staff');
 await page.getByLabel('Password saat ini',{exact:true}).fill('old-test-password');await page.getByLabel('Tampilkan password',{exact:true}).check();await expect(page.getByLabel('Password baru',{exact:true})).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'Ganti password',exact:true}).click();await expect(page.getByRole('status')).toContainText('Password berhasil diubah.');await expect(page.getByLabel('Password baru',{exact:true})).toHaveValue('');await expect(page.getByLabel('Password saat ini',{exact:true})).toHaveValue('');await expect(page.getByLabel('Tampilkan password',{exact:true})).not.toBeChecked();
 await page.reload();await expect(page.getByRole('heading',{name:'Ganti password',exact:true})).toBeVisible();expect(mock.counts['POST auth/password']).toBe(2);
});
test('program status uses three main choices and On Going finds legacy Active',async({page})=>{
 const mock=await mockApi(page);mock.rows.programs.push({id:'legacy-active',name:'Legacy active program',status:'Active',kind:'UKOR',pic:'Development Staff',assignee_ids:[user.id],progress:20});await login(page);await page.goto('/programs');
 await page.getByLabel('Filter status program').selectOption('Ongoing');await expect(page.getByRole('cell',{name:'Legacy active program'})).toBeVisible();await expect(page.locator('tbody .badge.status-running')).toHaveText('On Going');
 await page.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Status',{exact:true}).locator('option')).toHaveText(['Planning','On Going','Finished']);await expect(page.getByLabel('Status',{exact:true})).toHaveValue('Ongoing');await page.getByLabel('Status',{exact:true}).selectOption('Completed');await page.getByRole('button',{name:'Simpan',exact:true}).click();await page.getByLabel('Filter status program').selectOption('Completed');await expect(page.locator('tbody .badge.status-done')).toHaveText('Finished');
});

const teammateId='00000000-0000-0000-0000-000000000002';
function seedTeamPhoto(mock) {
 mock.profiles.push({id:teammateId,name:'Photo Teammate',role:'member',departmentRole:'staff',active:true,avatar_path:`${teammateId}/00000000-0000-0000-0000-000000000010.jpg`});
 mock.rows.programs.push({id:'photo-program',name:'Photo program',kind:'Proker',status:'Ongoing',progress:20,pic:'Old name must not be used',assignee_ids:[teammateId,user.id]});
 mock.rows.tasks.push({id:'photo-task',title:'Task with teammate',status:'To Do',priority:'Medium',assignee_id:teammateId,created_by:user.id,program_id:'photo-program'});
}
for(const width of [375,1440])test(`team photos identify program PJ and board/list assignment at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});const mock=await mockApi(page);seedTeamPhoto(mock);await login(page);
 await page.goto('/team');const member=page.locator('.member-list>div').filter({hasText:'Photo Teammate'});
 await expect(member.getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();await expect(member).toContainText('Photo Teammate');
 await page.goto('/programs');const program=page.locator('tbody tr').filter({hasText:'Photo program'});
 await expect(program.getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();await expect(program).not.toContainText('Old name');
 await program.getByRole('link',{name:'Buka program'}).click();const owners=page.locator('.program-members');
 await expect(owners.getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();await expect(owners).toContainText('Development Staff');
 const requestsBeforeTasks=mock.counts['GET profiles/avatars']||0;await page.goto('/tasks');const task=page.locator('.work-task').filter({hasText:'Task with teammate'});
 await expect(task.getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();await expect(task).toContainText('Photo Teammate');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`team-assignment-${width}.png`),fullPage:true});
 await page.getByRole('button',{name:'Daftar',exact:true}).click();const row=page.locator('tbody tr').filter({hasText:'Task with teammate'});
 await expect(row.getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();await row.getByRole('button',{name:'Detail',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();
 expect(mock.counts['GET profiles/avatars']).toBe(requestsBeforeTasks+1);expect(mock.counts['GET profiles/me/avatar']).toBeUndefined();
});
test('Staff can read teammate photos without management controls and broken photos retain names',async({page})=>{
 const mock=await mockApi(page,'member');seedTeamPhoto(mock);mock.profiles[0].testPhotoUrl='data:image/png;base64,broken';await login(page);await page.goto('/team');
 const member=page.locator('.member-list>div').filter({hasText:'Photo Teammate'});await expect(member.locator('.avatar')).toHaveText('PT');await expect(member.getByRole('img')).toHaveCount(0);await expect(member).toContainText('Photo Teammate');await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
});
test('photo service failure does not block team, program or task data and refresh recovers',async({page})=>{
 const mock=await mockApi(page);seedTeamPhoto(mock);mock.failAvatarDirectory();await login(page);await page.goto('/tasks');
 const task=page.locator('.work-task').filter({hasText:'Task with teammate'});await expect(task).toContainText('Photo Teammate');await expect(task.locator('.avatar')).toHaveText('PT');await expect(task.getByRole('button',{name:'Edit',exact:true})).toBeEnabled();
 mock.profiles[0].avatar_path=null;await page.getByRole('button',{name:'Muat ulang tugas'}).click();await expect(task).toContainText('Photo Teammate');await expect(task.getByRole('img')).toHaveCount(0);
});
test('replaced and removed photos refresh by current account pointer without stale directory images',async({page})=>{
 const mock=await mockApi(page);seedTeamPhoto(mock);await login(page);await page.goto('/tasks');const task=page.locator('.work-task').filter({hasText:'Task with teammate'});
 await expect(task.getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();mock.profiles[0].avatar_path=null;mock.profiles[0].name='Updated teammate';
 await page.getByRole('button',{name:'Muat ulang tugas'}).click();await expect(task).toContainText('Updated teammate');await expect(task.getByRole('img')).toHaveCount(0);await expect(task.locator('.avatar')).toHaveText('UT');
 mock.profiles[0].avatar_path=`${teammateId}/00000000-0000-0000-0000-000000000011.jpg`;await page.getByRole('button',{name:'Muat ulang tugas'}).click();await expect(task.getByRole('img',{name:'Foto profil Updated teammate',exact:true})).toBeVisible();
});

test('directory signed URLs refresh before expiry without reloading tasks',async({page})=>{
 await page.clock.install();const mock=await mockApi(page);seedTeamPhoto(mock);await login(page);await page.goto('/tasks');
 await expect(page.locator('.work-task').getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();expect(mock.counts['GET profiles/avatars']).toBe(1);
 await page.clock.fastForward(12*60*1000);await expect.poll(()=>mock.counts['GET profiles/avatars']).toBe(2);await expect(page.getByRole('heading',{name:'Task with teammate',exact:true})).toBeVisible();
});

test('program directory failure retains program and retries account identities',async({page})=>{
 const mock=await mockApi(page);seedTeamPhoto(mock);let unavailable=true;
 await page.route(url=>url.pathname==='/api/directory',route=>unavailable?route.fulfill({status:503,json:{error:{message:'Profile directory unavailable'}}}):route.fallback());
 await login(page);await page.goto('/programs/photo-program');await expect(page.getByRole('heading',{name:'Photo program',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toContainText('Daftar akun tidak tersedia');
 unavailable=false;await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await expect(page.locator('.program-members')).toContainText('Photo Teammate');await expect(page.locator('.program-members').getByRole('img',{name:'Foto profil Photo Teammate',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});

test('cold board batches five columns and summary without full collections',async({page})=>{
 const mock=await mockApi(page);await login(page);await page.goto('/tasks');await expect(page.getByRole('heading',{name:'Review proposal',exact:true})).toBeVisible();await expect(page.getByLabel('Filter akun PJ').locator('option')).toHaveCount(2);
 expect(mock.counts['GET tasks/board']).toBe(1);expect(mock.counts['GET directory']).toBe(1);expect(mock.counts['GET tasks/summary']).toBeUndefined();expect(mock.counts['GET tasks']).toBeUndefined();expect(mock.counts['GET profiles']).toBeUndefined();expect(mock.counts['GET programs']).toBeUndefined();
});
test('compact task cards load full details before edit and preserve description',async({page})=>{
 const mock=await mockApi(page);mock.rows.programs.push({id:'task-program',name:'Development Proker',kind:'Proker',assignee_ids:[user.id]});const description='Full description retained. '.repeat(50);mock.rows.tasks[0].description=description;await login(page);await page.goto('/tasks');const card=page.locator('.work-task').filter({hasText:'Review proposal'});
 await card.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Deskripsi',{exact:true})).toHaveValue(description);await page.getByLabel('Judul',{exact:true}).fill('Edited compact task');await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.getByRole('heading',{name:'Edited compact task',exact:true})).toBeVisible();expect(mock.rows.tasks[0].description).toBe(description);expect(mock.counts['GET tasks/task-id']).toBe(1);
});
test('failed detail read retains compact board and never opens an empty editor',async({page})=>{
 await mockApi(page);await page.route(url=>url.pathname==='/api/tasks/task-id',route=>route.request().method()==='GET'?route.fulfill({status:404,json:{error:{message:'Tugas tidak ditemukan.'}}}):route.fallback());await login(page);await page.goto('/tasks');await page.locator('.work-task').getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Tugas tidak ditemukan.');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Review proposal',exact:true})).toBeVisible();
});

test('one failed board snapshot reports one retry action and retains filters',async({page})=>{
 await mockApi(page);let unavailable=true;
 await page.route(url=>url.pathname==='/api/tasks/board',route=>unavailable?route.fulfill({status:503,json:{error:{message:'Snapshot unavailable'}}}):route.fallback());
 await login(page);await page.goto('/tasks');await expect(page.getByRole('alert')).toHaveCount(1);await expect(page.getByRole('alert')).toContainText('Snapshot unavailable');const failedFiltered=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tasks/board'&&new URL(r.url()).searchParams.get('priority')==='Medium'&&r.status()===503);await page.getByLabel('Filter prioritas').selectOption('Medium');await failedFiltered;await expect(page.getByRole('alert')).toContainText('Snapshot unavailable');
 unavailable=false;await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await expect(page.getByRole('heading',{name:'Review proposal',exact:true})).toBeVisible();await expect(page.getByLabel('Filter prioritas')).toHaveValue('Medium');await expect(page.getByRole('alert')).toHaveCount(0);
});

for(const width of [375,1440])test(`small program tasks require a parent and legacy tasks can be linked at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:900});const mock=await mockApi(page);
 mock.rows.tasks[0].program_id=null;mock.rows.tasks[0].description='Keep this legacy description';
 mock.rows.programs.push({id:'task-proker',name:'Fixture Tournament',kind:'Proker',status:'Planning',assignee_ids:[user.id]},{id:'task-ukor',name:'Fixture Training',kind:'UKOR',status:'Ongoing',assignee_ids:[user.id]});
 await login(page);await page.goto('/tasks');await expect(page.locator('.task-link-notice')).toContainText('1 tugas lama');
 await page.getByRole('button',{name:'Tambah tugas',exact:true}).click();await page.getByLabel('Judul',{exact:true}).fill('Confirm court booking');
 await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();expect(mock.counts['POST tasks']).toBeUndefined();
 expect(await page.getByRole('dialog').getByLabel('Program',{exact:true}).evaluate(el=>el.validity.valueMissing)).toBe(true);
 await page.getByRole('dialog').getByLabel('Program',{exact:true}).selectOption('task-proker');await page.getByRole('button',{name:'Simpan',exact:true}).click();
 const card=page.locator('.work-task').filter({has:page.getByRole('heading',{name:'Confirm court booking',exact:true})});
 await expect(card.getByRole('link',{name:'Proker · Fixture Tournament'})).toBeVisible();expect(mock.rows.tasks.find(t=>t.title==='Confirm court booking').program_id).toBe('task-proker');
 await page.getByRole('button',{name:'Tampilkan tugas',exact:true}).click();await expect(page.locator('.work-task')).toHaveCount(1);
 await page.getByRole('button',{name:'Daftar',exact:true}).click();await expect(page.locator('.task-list-view tbody tr')).toHaveCount(1);await expect(page.locator('.task-list-view')).toContainText('Perlu ditautkan');
 await page.getByRole('button',{name:'Tautkan program',exact:true}).click();await expect(page.getByLabel('Deskripsi',{exact:true})).toHaveValue('Keep this legacy description');
 await page.getByRole('dialog').getByLabel('Program',{exact:true}).selectOption('task-ukor');await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.locator('.task-list-view tbody tr')).toHaveCount(0);
 expect(mock.rows.tasks).toHaveLength(2);expect(mock.rows.tasks[0]).toMatchObject({program_id:'task-ukor',assignee_id:user.id,description:'Keep this legacy description',status:'To Do'});
 await page.getByLabel('Filter program tugas').selectOption('task-ukor');await page.getByRole('button',{name:'Papan',exact:true}).click();await expect(page.locator('.work-task')).toHaveCount(1);
 await page.getByRole('button',{name:'Tambah tugas Backlog',exact:true}).click();await expect(page.getByRole('dialog').getByLabel('Program',{exact:true})).toHaveValue('task-ukor');await page.getByRole('button',{name:'Batal',exact:true}).click();
 await page.getByRole('link',{name:'UKOR · Fixture Training',exact:true}).click();await expect(page.getByRole('heading',{name:'Fixture Training',exact:true})).toBeVisible();await page.getByRole('button',{name:'Tugas',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Review proposal',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Confirm court booking',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Tugas baru',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Tugas pelaksanaan · Fixture Training');await expect(page.getByRole('dialog').getByLabel('Program',{exact:true})).toHaveCount(0);await page.getByLabel('Judul',{exact:true}).fill('Prepare equipment');await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.getByRole('heading',{name:'Prepare equipment',exact:true})).toBeVisible();expect(mock.rows.tasks.find(t=>t.title==='Prepare equipment').program_id).toBe('task-ukor');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('small-program-tasks.png'),fullPage:true});
});

test('dashboard panel headings follow h1 and own header requests only a small thumbnail',async({page})=>{
 const mock=await mockApi(page);await login(page);await expect(page.getByRole('heading',{name:'Progres Proker & UKOR',level:2})).toBeVisible();await expect(page.getByRole('heading',{name:'Performa Staff',level:2})).toBeVisible();
 await page.goto('/settings');await page.getByLabel('Pilih foto profil').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:photoFixture});
 const preview=page.getByRole('img',{name:'Pratinjau foto profil'});await expect(preview).toBeVisible();expect(await preview.evaluate(img=>img.naturalWidth)).toBe(256);
 const requested=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/profiles/me/avatar'&&new URL(r.url()).searchParams.get('size')==='96');
 await page.getByRole('button',{name:'Simpan foto',exact:true}).click();await requested;
 await expect(page.locator('.topbar img')).toHaveAttribute('width','30');await expect(page.locator('.topbar img')).toHaveAttribute('height','30');expect(mock.counts['PUT profiles/me/avatar']).toBe(1);
});
