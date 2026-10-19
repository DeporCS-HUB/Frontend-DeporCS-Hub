import test from 'node:test';
import assert from 'node:assert/strict';
import {programStatuses,programStatusLabel,programStatusGroup} from '../src/lib/programs.js';
test('three primary program statuses preserve stored values and legacy semantics',()=>{
 assert.deepEqual(programStatuses,['Planning','Ongoing','Completed']);assert.deepEqual(programStatuses.map(programStatusLabel),['Planning','On Going','Finished']);assert.equal(programStatusLabel('Active'),'On Going');assert.equal(programStatusGroup('Active'),'running');assert.equal(programStatusGroup('Completed'),'done');assert.equal(programStatusGroup('Unspecified'),'unknown');
});
