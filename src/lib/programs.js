import { canManage } from './roles';
export const programStatuses = ['Planning','Ongoing','Active','Completed','Cancelled','Unspecified'];
export const programStatusLabel = status => ({ Unspecified: 'Belum diisi', Planning: 'Rencana', Ongoing: 'Berjalan', Active: 'Aktif', Completed: 'Selesai', Cancelled: 'Dibatalkan' }[status] || status);
export function canUpdateProgram(user, program) {
  return Boolean(user && (canManage(user) || program.assignee_ids?.includes(user.id)));
}
