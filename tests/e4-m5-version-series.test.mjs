import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';
import {VersionSeries} from '../src/workspace/version-series.mjs';
import {hash} from '../src/native/schema.mjs';
async function setup(t){const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'Version series'});await f.call('workspace.action',{action:'create',kind:'part',path:'Part.engineer.json',expectedRevision:(await f.call('workspace.inspect')).revision});const doc=f.adapter.doc;return {doc,series:new VersionSeries(doc)};}
test('save-point creates a new Main, freezes the former Main and promotion retains both identities',async t=>{
 const {doc,series:s}=await setup(t),first=await s.read();assert.equal(first.nodes.length,1);
 doc.value.metadata.notes='Before save point';doc.value.revision++;
 const next=await s.create({expectedRevision:doc.value.revision,name:'Second'});assert.notEqual(next.node.id,first.mainId);assert.equal(next.history.nodes.length,2);
 doc.value.metadata.notes='After save point';doc.value.revision++;
 assert.equal((await s.snapshot(first.mainId)).document.metadata.notes,'Before save point');
 await s.promote({expectedRevision:doc.value.revision,nodeId:first.mainId});assert.equal(doc.value.metadata.notes,'Before save point');
 assert.equal((await s.snapshot(next.node.id)).document.metadata.notes,'After save point');assert.equal((await s.read()).mainId,first.mainId);
 const reloaded=new VersionSeries(doc);assert.deepEqual(await reloaded.read(),await s.read());
});
test('deletion chooses the surviving row above, follows deletion chains and cannot remove the only Main',async t=>{
 const {doc,series:s}=await setup(t),a=(await s.read()).mainId,b=(await s.create({expectedRevision:doc.value.revision,name:'B'})).node.id,c=(await s.create({expectedRevision:doc.value.revision,name:'C'})).node.id;
 const removed=await s.remove({expectedRevision:doc.value.revision,nodeId:b});assert.equal(removed.replacementId,c);assert.equal(s.resolve(await s.read(),b).id,c);
 await s.remove({expectedRevision:doc.value.revision,nodeId:c});const current=await s.read();assert.equal(current.mainId,a);assert.equal(s.resolve(current,b).id,a);
 await assert.rejects(s.remove({expectedRevision:doc.value.revision,nodeId:a}),{code:'LastVersion'});
});
test('failed save-point preserves the document and history; metadata edits reject stale history',async t=>{
 const {doc,series:s}=await setup(t),first=await s.read(),before=hash(doc.value),save=doc.save.bind(doc);doc.save=async()=>{throw Object.assign(Error('injected'),{code:'Injected'});};
 await assert.rejects(s.create({expectedRevision:doc.value.revision,name:'Interrupted'}),{code:'Injected'});doc.save=save;assert.equal(hash(doc.value),before);assert.deepEqual(await s.read(),first);
 await s.edit({expectedRevision:doc.value.revision,expectedHistoryRevision:first.revision,nodeId:first.mainId,name:'Renamed',description:'Description'});
 await assert.rejects(s.edit({expectedRevision:doc.value.revision,expectedHistoryRevision:first.revision,nodeId:first.mainId,name:'Stale'}),{code:'RevisionConflict'});
});
test('promoting old versions keeps the remaining list in creation order; deleting Main chooses the newest survivor',async t=>{
 const {doc,series:s}=await setup(t),a=(await s.read()).mainId,b=(await s.create({expectedRevision:doc.value.revision,name:'B'})).node.id,c=(await s.create({expectedRevision:doc.value.revision,name:'C'})).node.id;
 await s.promote({expectedRevision:doc.value.revision,nodeId:a});await s.promote({expectedRevision:doc.value.revision,nodeId:b});assert.deepEqual((await s.read()).nodes.map(n=>n.id),[b,c,a]);await s.remove({expectedRevision:doc.value.revision,nodeId:b});assert.equal((await s.read()).mainId,c);
});
test('automatic version names do not reuse the ordinal of a deleted save point',async t=>{
 const {doc,series:s}=await setup(t);const b=await s.create({expectedRevision:doc.value.revision});await s.remove({expectedRevision:doc.value.revision,nodeId:b.node.id});const c=await s.create({expectedRevision:doc.value.revision});assert.equal(b.node.name,'Version 2');assert.equal(c.node.name,'Version 3');
});
