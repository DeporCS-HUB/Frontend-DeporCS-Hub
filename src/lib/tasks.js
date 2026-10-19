export const taskStatuses = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
export const taskStatusLabels = { Backlog: 'Backlog', 'To Do': 'Perlu dikerjakan', 'In Progress': 'Dikerjakan', Review: 'Dalam review', Done: 'Selesai' };
export const taskTone = status => ({ Done: 'done', 'In Progress': 'running', Review: 'planned', Backlog: 'unknown', 'To Do': 'unknown' })[status] || 'unknown';
export const jakartaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const isOverdue = task => task.status !== 'Done' && Boolean(task.due_date && task.due_date < jakartaToday());
export const accountLabel = (profiles, id) => !id ? 'Belum ada PJ' : profiles.find(p => p.id === id)?.name || 'Akun tidak tersedia';
export const initials = name => name.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
