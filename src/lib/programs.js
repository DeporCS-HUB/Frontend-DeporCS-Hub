import { canManage } from './roles.js';
export const programStatuses = ['Planning','Ongoing','Completed'];
export const programStatusLabel = status => ({ Unspecified: 'Belum diisi', Planning: 'Planning', Ongoing: 'On Going', Active: 'On Going', Completed: 'Finished', Cancelled: 'Dibatalkan' }[status] || status);
export function canUpdateProgram(user, program) {
  return Boolean(user && (canManage(user) || program.assignee_ids?.includes(user.id)));
}

export const programStatusGroup = status => status === 'Completed' ? 'done' : ['Ongoing','Active'].includes(status) ? 'running' : status === 'Planning' ? 'planned' : status === 'Cancelled' ? 'cancelled' : 'unknown';
