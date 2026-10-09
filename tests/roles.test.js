import test from 'node:test';
import assert from 'node:assert/strict';
import { canManage, departmentRole, roleLabel } from '../src/lib/roles.js';

test('existing profiles keep their privilege boundary during a backend rollout', () => {
  assert.equal(roleLabel({ role: 'staff' }), 'BPH');
  assert.equal(roleLabel({ role: 'admin' }), 'BPH');
  assert.equal(roleLabel({ role: 'member' }), 'Staff');
  assert.equal(canManage({ role: 'member' }), false);
  assert.equal(canManage({ role: 'staff' }), true);
});
test('a trusted Staff department role cannot inherit management controls from a legacy field', () => {
  const profile = { role: 'admin', departmentRole: 'staff' };
  assert.equal(roleLabel(profile), 'Staff');
  assert.equal(canManage(profile), false);
  assert.equal(canManage({ role: 'staff', departmentRole: 'bph' }), true);
});
test('missing or unrecognized roles fail closed', () => {
  for (const profile of [null, {}, { role: 'invented' }, { role: 'admin', departmentRole: 'invented' }, { role: 'admin', departmentRole: null }]) {
    assert.equal(canManage(profile), false);
    assert.equal(departmentRole(profile), null);
    assert.equal(roleLabel(profile), 'Role tidak dikenali');
  }
});
