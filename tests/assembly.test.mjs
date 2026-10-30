import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,http} from './helpers.mjs';
import {assemblyFixture} from '../src/assembly/fixtures.mjs';
import {assemblyRecipe} from '../src/assembly/profile.mjs';
import {solveAssembly} from '../src/assembly/solver.mjs';
import {runWorker} from '../src/lab/jobs.mjs';
import {validate} from '../src/document.mjs';
const completed=async call=>{for(let i=0;i<200;i++){const r=await call('lab.inspect');if(r.job.state!=='running')return r;await new Promise(r=>setTimeout(r,25));}throw Error('Spatial worker did not complete');};
test('28 independent spatial fixtures and motion-path samples pass in isolated worker',async()=>{const {result,resources}=await runWorker('assembly-suite');assert.equal(result.total,28);assert.equal(result.failed,0,JSON.stringify(result.cases.filter(c=>!c.passed)));assert.ok(resources.peakRssBytes>0);});
test('three-body drag moves the dependent cap while preserving independently known spacing',()=>{const r=solveAssembly(assemblyFixture('three-body'),{drag:{bodyId:'collar',position:[0,0,35]}});assert.equal(r.drag.accepted,true);assert.equal(r.remainingDOF,3);assert.ok(Math.abs(r.poses[1].position[2]-35)<1e-5);assert.ok(Math.abs(r.poses[2].position[2]-47)<1e-5);assert.deepEqual(r.poses[0].position,[0,0,0]);});
test('world/local datum frames and non-identity rigid rotations produce independent expected point placement',()=>{
  const a=assemblyFixture('point');a.bodies[0].pose.position=[10,20,30];a.bodies[0].pose.quaternion=[0,0,Math.SQRT1_2,Math.SQRT1_2];a.bodies[0].datums[0].origin=[2,0,0];
  a.bodies[1].datums[0].origin=[0,3,0];a.bodies[1].grounded=true; // Both grounded gives a known feasible transform, no solve freedom.
  a.bodies[1].pose.position=[10,19,30];const r=solveAssembly(a);assert.equal(r.status,'RedundantConsistent');assert.equal(r.remainingDOF,0);assert.ok(r.evidence.maxLengthResidualMm<1e-10);
  a.bodies[1].pose.position[0]=12;assert.equal(solveAssembly(a).status,'Inconsistent');
});
test('invalid numerical frames, unknown keys, IDs and surface classes are refused without retargeting',()=>{
  for(const mutate of [a=>a.bodies[1].pose.quaternion=[0,0,0,2],a=>a.bodies[1].pose.position[0]=NaN,a=>a.bodies[1].grounded='yes',a=>a.bodies[1].datums[1].direction=[0,0,0],a=>a.bodies[1].script='run',a=>a.unit='inch',a=>a.bodies[1].id='shaft']){const a=assemblyFixture();mutate(a);assert.throws(()=>assemblyRecipe(a));}
  assert.throws(()=>assemblyRecipe(assemblyFixture('missing')),{code:'LostReference'});assert.throws(()=>assemblyRecipe(assemblyFixture('ambiguous')),{code:'AmbiguousReference'});
  assert.throws(()=>solveAssembly(assemblyFixture(),{drag:{bodyId:'collar',position:[Infinity,0,0]}}),{code:'InvalidInput'});
});
test('assembly preview, explicit apply, save and reopen retain exact recipe plus E0.M2 geometry',async t=>{
  const {folder,call,adapter}=await fixture(t),created=await call('project.create',{path:folder,name:'Spatial persistence'});
  await call('lab.run',{kind:'geometry',expectedRevision:0});let r=await completed(call);await call('lab.apply',{expectedRevision:0,jobId:r.preview.jobId});
  await call('project.save',{expectedRevision:1});const before=await readFile(created.path);
  await call('lab.run',{kind:'assembly',assembly:assemblyFixture(),drag:{bodyId:'collar',position:[0,0,35]},expectedRevision:1});r=await completed(call);assert.equal(r.job.state,'completed');assert.equal(r.assembly.remainingDOF,2);assert.deepEqual(await readFile(created.path),before);
  await call('lab.apply',{kind:'assembly',jobId:r.assembly.jobId,expectedRevision:1});assert.equal(adapter.doc.value.revision,2);assert.equal(adapter.doc.value.provisional,'E0.M3');await call('project.save',{expectedRevision:2});
  const saved=JSON.parse(await readFile(created.path));assert.equal(saved.experiment.spec.scenario,'cut');assert.ok(Math.abs(saved.assembly.bodies[1].pose.position[2]-35)<1e-5);assert.deepEqual(validate(saved),saved);
  const {Document}=await import('../src/document.mjs');const reopened=new Document(created.path,saved);assert.deepEqual(reopened.view().document,saved);assert.equal(solveAssembly(saved.assembly).remainingDOF,2);
  await call('lab.run',{kind:'geometry',expectedRevision:2});r=await completed(call);await call('lab.apply',{jobId:r.preview.jobId,expectedRevision:2});assert.equal(adapter.doc.value.provisional,'E0.M3');validate(adapter.doc.value);
});
test('inconsistent, singular, missing and infeasible drag leave last good placement and saved bytes intact',async t=>{
  const {folder,call}=await fixture(t),created=await call('project.create',{path:folder,name:'Safe motion'}),bytes=await readFile(created.path);
  await call('lab.run',{kind:'assembly',assembly:assemblyFixture(),expectedRevision:0});const good=await completed(call);
  for(const name of ['conflict-distance','singular-distance']){await call('lab.run',{kind:'assembly',assembly:assemblyFixture(name),expectedRevision:0});const bad=await completed(call);assert.equal(bad.assembly.jobId,good.assembly.jobId);assert.equal(bad.assemblyResult.applicable,false);await assert.rejects(call('lab.apply',{kind:'assembly',jobId:bad.job.id,expectedRevision:0}),{code:'revisionConflict'});}
  await assert.rejects(call('lab.run',{kind:'assembly',assembly:assemblyFixture('missing'),expectedRevision:0}),{code:'LostReference'});
  await call('lab.run',{kind:'assembly',assembly:good.assembly.solvedRecipe,drag:{bodyId:'collar',position:[10,0,35]},expectedRevision:0});const denied=await completed(call);assert.equal(denied.assemblyResult.drag.accepted,false);assert.deepEqual(denied.assembly.poses,good.assembly.poses);assert.deepEqual(await readFile(created.path),bytes);
});
test('spatial cancellation, deadline and stale apply cannot publish late poses',async t=>{
  const signal=new AbortController();signal.abort();await assert.rejects(runWorker('assembly-suite',{}, {signal:signal.signal}),{code:'Cancelled'});await assert.rejects(runWorker('assembly-suite',{}, {timeoutMs:1}),{code:'ResourceLimit'});
  const {folder,call}=await fixture(t);await call('project.create',{path:folder,name:'Stale spatial'});await call('lab.run',{kind:'assembly',assembly:assemblyFixture(),expectedRevision:0});
  await call('document.edit',{metadata:{name:'Newer edit',notes:''},expectedRevision:0});const stale=await completed(call);assert.equal(stale.job.state,'stale');assert.equal(stale.assembly,null);await assert.rejects(call('lab.apply',{kind:'assembly',jobId:stale.job.id,expectedRevision:1}),{code:'revisionConflict'});
});
test('HTTP spatial operations share authority, reject stale drag and cancel on close',async t=>{
  const {folder,call}=await fixture(t),created=await call('project.create',{path:folder,name:'Spatial HTTP'});
  assert.equal((await http(created.editorUrl,'lab/run',{kind:'assembly',assembly:assemblyFixture('three-body'),expectedRevision:0})).status,200);
  const r=await completed(call);assert.equal(r.assembly.remainingDOF,3);assert.equal((await http(created.editorUrl,'lab/apply',{kind:'assembly',expectedRevision:99,jobId:r.job.id})).status,409);
  await call('lab.run',{kind:'assembly-suite',expectedRevision:0});await call('project.close',{expectedRevision:0,decision:'discard'});
});
test('version-owned spatial demo is an actual portable native datum recipe',async t=>{const {root,call}=await fixture(t),destination=join(root,'spatial-demos');await mkdir(destination);const r=await call('project.demos',{destination,demoIds:['e0-m3-mates']});const d=JSON.parse(await readFile(r.projects[0].path));assert.equal(d.provisional,'E0.M3');assert.equal(solveAssembly(d.assembly).remainingDOF,2);});
