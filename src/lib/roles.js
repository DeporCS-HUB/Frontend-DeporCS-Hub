// Product roles are issued by the backend. Legacy database roles remain compatible.
export function departmentRole(profile) {
  if (!profile) return null;
  if (profile.departmentRole !== undefined) {
    return ['bph', 'staff'].includes(profile.departmentRole) ? profile.departmentRole : null;
  }
  if (profile.role === 'member') return 'staff';
  if (['staff', 'admin'].includes(profile.role)) return 'bph';
  return null;
}
export function canManage(profile) { return departmentRole(profile) === 'bph'; }
export function roleLabel(profile) {
  const role = departmentRole(profile);
  return role === 'bph' ? 'BPH' : role === 'staff' ? 'Staff' : 'Role tidak dikenali';
}
