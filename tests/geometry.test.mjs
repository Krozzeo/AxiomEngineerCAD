import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {fixture,http} from './helpers.mjs';
import {runWorker} from '../src/lab/jobs.mjs';
import {recipe} from '../src/lab/profile.mjs';
import {validateSketch,sketchFixture,solveSketch} from '../src/lab/sketch.mjs';
import manifest from '../platform/product.json' with {type:'json'};

async function completed(call){for(let i=0;i<200;i++){const result=await call('lab.inspect');if(result.job?.state!=='running')return result;await new Promise(r=>setTimeout(r,50));}throw Error('Lab did not finish');}
test('29 exact-kernel / topology / 2D fixtures pass independent analytic and rank checks',async()=>{
  const {result,resources}=await runWorker('suite');assert.equal(result.total,29);assert.equal(result.failed,0,JSON.stringify(result.cases.filter(c=>!c.passed)));
  assert.equal(result.passed,29);assert.ok(resources.peakRssBytes>0);assert.ok(result.cases.find(c=>c.id==='TOPO-SPLIT').actual.reference.candidates>1);
  assert.equal(result.cases.find(c=>c.id==='TOPO-IMPORT').actual.reference.state,'LostReference');
});
test('invalid/oversized/nonfinite recipes fail before dispatch',()=>{
  for(const bad of [{width:NaN},{depth:0},{radius:Infinity},{scenario:'eval'},{count:100},{script:'process.exit()'},{unit:'unknown'}])assert.throws(()=>recipe(bad));
  const data=sketchFixture('rectangle');data[4].p1_id='missing';assert.throws(()=>validateSketch(data),{code:'LostReference'});
});
test('worker cancellation and deadline kill isolated jobs without a late result',async()=>{
  const controller=new AbortController(),work=runWorker('suite',{}, {signal:controller.signal});
  setTimeout(()=>controller.abort(),100);await assert.rejects(work,{code:'Cancelled'});
  await assert.rejects(runWorker('suite',{}, {timeoutMs:1}),{code:'ResourceLimit'});
});
test('non-driving reference radius does not constrain geometry',async()=>{
  const data=sketchFixture('free-circle');data[2]={...data[2],radius:99,driving:false};
  const result=await solveSketch(data);assert.equal(result.status,'UnderDefined');assert.equal(result.remainingDOF,3);
  assert.equal(result.primitives.find(p=>p.id==='circle').radius,4);
});
test('preview/apply/save/reopen preserve provisional recipe and original metadata',async t=>{
  const {folder,call,adapter,root}=await fixture(t),created=await call('project.create',{path:folder,name:'E0.M2 fixture'});
  const before=await readFile(created.path);
  const spec={scenario:'cut',width:60};await call('lab.run',{kind:'geometry',spec,expectedRevision:0});
  const result=await completed(call);assert.equal(result.job.state,'completed',JSON.stringify(result.job));
  assert.deepEqual(await readFile(created.path),before);assert.equal(adapter.doc.value.provisional,'E0.M1');
  await call('lab.apply',{jobId:result.preview.jobId,expectedRevision:0});assert.equal(adapter.doc.value.provisional,'E0.M2');
  await call('project.save',{expectedRevision:1});const saved=JSON.parse(await readFile(created.path));assert.equal(saved.experiment.spec.width,60);assert.equal(saved.metadata.name,'E0.M2 fixture');
  await call('project.close',{expectedRevision:1,decision:'save'});
  const {EngineerAdapter}=await import('../platform/adapter.mjs');const other=new EngineerAdapter();t.after(()=>other.shutdown());other.sessionId=randomUUID();
  await other.execute('initialize',{platformVersion:'0.1.12',authorizedRoot:root});await other.execute('project.open',{path:folder,operationId:randomUUID()});
  assert.deepEqual(other.doc.value,saved);
});
test('failed and cancelled lab jobs preserve last good preview and committed file',async t=>{
  const {folder,call}=await fixture(t),created=await call('project.create',{path:folder,name:'Recovery'}),before=await readFile(created.path);
  await call('lab.run',{kind:'geometry',spec:{scenario:'extrude'},expectedRevision:0});const good=await completed(call);assert.equal(good.job.state,'completed');
  await call('lab.run',{kind:'geometry',spec:{scenario:'invalid-profile'},expectedRevision:0});const bad=await completed(call);assert.equal(bad.job.state,'failed');assert.equal(bad.job.error.code,'InvalidGeometry');assert.equal(bad.preview.jobId,good.preview.jobId);
  await call('lab.run',{kind:'suite',expectedRevision:0});await call('lab.cancel');const cancelled=await completed(call);assert.equal(cancelled.job.state,'cancelled');assert.deepEqual(await readFile(created.path),before);
});
test('stale worker results cannot overwrite newer manual edits',async t=>{
  const {folder,call,adapter}=await fixture(t);await call('project.create',{path:folder,name:'Stale worker'});
  await call('lab.run',{kind:'suite',expectedRevision:0});await call('document.edit',{expectedRevision:0,metadata:{name:'Newer manual edit',notes:''}});
  const stale=await completed(call);assert.equal(stale.job.state,'stale');assert.equal(adapter.doc.value.revision,1);assert.equal(adapter.doc.value.metadata.name,'Newer manual edit');
  await assert.rejects(call('lab.apply',{jobId:stale.job.id,expectedRevision:1}),{code:'revisionConflict'});
});
test('same worker authority is reachable through authenticated HTTP; close cancels owned jobs',async t=>{
  const {folder,call}=await fixture(t),created=await call('project.create',{path:folder,name:'HTTP lab'});
  const started=await http(created.editorUrl,'lab/run',{kind:'sketch',fixture:'rectangle',expectedRevision:0});assert.equal(started.status,200);
  const done=await completed(call);assert.equal(done.sketch.status,'FullyDefined');
  await call('lab.run',{kind:'suite',expectedRevision:0});await call('project.close',{expectedRevision:0,decision:'discard'});
  assert.equal((await readdir(folder)).includes('.axiom-platform-session.lock'),false);
});
test('version-owned demo creates actual native experiment and rejects nonempty destination',async t=>{
  const {root,call}=await fixture(t),destination=join(root,'demos');await mkdir(destination);
  const result=await call('project.demos',{destination,demoIds:['e0-m2-lab']});assert.equal(result.productVersion,manifest.productVersion);assert.equal(result.projects.length,1);
  const demo=JSON.parse(await readFile(result.projects[0].path));assert.equal(demo.provisional,'E0.M2');assert.equal(demo.experiment.spec.scenario,'cut');
  await assert.rejects(call('project.demos',{destination,demoIds:['e0-m2-lab']}),{code:'projectBusy'});
});
