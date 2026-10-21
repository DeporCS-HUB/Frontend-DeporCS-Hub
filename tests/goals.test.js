import test from 'node:test';
import assert from 'node:assert/strict';
import { goalResult, milestonePayload, agendaTime } from '../src/lib/goals.js';
test('unknown is distinct from measured zero and exceeded targets stay readable', () => {
 const g = {metric_type:'count',target_value:3,unit:'sesi'};
 assert.equal(goalResult({...g,actual_value:null}).unknown,true);
 assert.deepEqual([goalResult({...g,actual_value:0}).unknown,goalResult({...g,actual_value:0}).ratio],[false,0]);
 const exceeded=goalResult({...g,actual_value:4});assert.equal(exceeded.ratio,100);assert.equal(exceeded.actualLabel,'4 sesi');assert.equal(exceeded.met,true);
 assert.equal(goalResult({metric_type:'boolean',target_value:1,actual_value:0}).actualLabel,'Belum');
});
test('status-only agenda action preserves timing and provenance without copying protected fields', () => {
 const item={id:'protected',source_key:'private',created_by:'server',title:'Fixture match',due_date:'2026-10-28',start_time:'18:30:00',end_time:'19:30:00',venue:'Court',description:'Await updated slot',source_ref:'Fixture sheet G150',schedule_status:'Tentative',status:'Planned'};
 assert.deepEqual(milestonePayload(item,'Done'),{title:item.title,due_date:item.due_date,start_time:item.start_time,end_time:item.end_time,venue:item.venue,description:item.description,source_ref:item.source_ref,schedule_status:'Tentative',status:'Done'});
 assert.equal(agendaTime(item),'18:30–19:30 WIB');assert.equal(agendaTime({}),'');
});
