import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';
import {runWorker} from '../src/lab/jobs.mjs';
import {MATE_PROFILE} from '../src/assembly/native-profile.mjs';
async function demo(t){const f=await fixture(t,{projectContainers:true}),d=await f.call('project.demos',{destination:f.folder,demoIds:['e4-m4-versioned-assemblies']});await f.call('project.open',{path:d.projects[0].path});return f;}
test('missing and conflicting native mates remain explicit, disabled mates do not participate, and retained issues save safely',async t=>{
 const f=await demo(t),doc=f.adapter.doc,next=structuredClone(doc.value),spatial=next.native.graph.spatial;spatial.profile=MATE_PROFILE;
 const reference=spatial.mates[0].b;
 spatial.mates.push({id:'missing-face',name:'Lost face',type:'parallel',a:spatial.mates[1].a,b:{...reference,kind:'face',producerId:'solid',role:'removed-face'}});
 let {result}=await runWorker('spatial-reconcile',{document:next});assert.equal(result.issues.find(i=>i.id==='missing-face').kind,'MissingReference');assert.equal(result.document.native.graph.spatial.mates.find(m=>m.id==='missing-face').issue.kind,'MissingReference');await runWorker('native-verify',{document:result.document});
 result.document.native.graph.spatial.mates.find(m=>m.id==='missing-face').disabled=true;
 ({result}=await runWorker('spatial-reconcile',{document:result.document}));assert.equal(result.issues.length,0);const missing=result.document.native.graph.spatial.mates.find(m=>m.id==='missing-face');assert.equal(missing.disabled,true);assert.equal(missing.issue,undefined);
 const conflict=structuredClone(result.document),height=conflict.native.graph.spatial.mates.find(m=>m.type==='distance');conflict.native.graph.spatial.mates.push({...structuredClone(height),id:'incompatible-height',name:'Conflicting height',value:height.value+10});
 const diagnosed=(await runWorker('spatial-reconcile',{document:conflict})).result;assert.ok(diagnosed.issues.some(i=>i.kind==='Conflict'));await runWorker('native-verify',{document:diagnosed.document});
 doc.native.set(diagnosed.document,doc.value.revision);await doc.save(doc.value.revision);assert.equal(doc.status().dirty,false);
});
test('reference direction normalization survives rotated occurrence frames and native save',async t=>{
 const f=await demo(t),doc=f.adapter.doc;const before=structuredClone(doc.value),pin=before.native.graph.instances.find(i=>i.id==='pin-0');pin.transform.quaternion=[0,0,Math.sin(.731),Math.cos(.731)];
 const solved=(await runWorker('spatial-native',{document:before})).result;assert.equal(solved.diagnostics.applicable,true);for(const body of solved.model.recipe.bodies)for(const datum of body.datums)if(datum.direction){assert.ok(Math.abs(Math.hypot(...datum.direction)-1)<1e-12);assert.ok(datum.direction.every(v=>Math.abs(v)<=1));}
 doc.native.set(solved.document,doc.value.revision);await doc.save(doc.value.revision);assert.equal(doc.status().dirty,false);
});
