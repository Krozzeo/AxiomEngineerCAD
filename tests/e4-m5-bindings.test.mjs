import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';
import {series} from '../src/workspace/version-bindings.mjs';
import {MATE_PROFILE} from '../src/assembly/native-profile.mjs';
import {runWorker} from '../src/lab/jobs.mjs';
import {randomUUID} from 'node:crypto';
import {registry} from '../src/commands/catalog.mjs';
test('new insertion follows Main, instance-specific version changes and deleted-version replacement preserve separate consumers',async t=>{
 const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'Bindings'});const w=f.adapter.workspace;
 const create=async path=>f.call('workspace.action',{action:'create',kind:'part',path,expectedRevision:(await f.call('workspace.inspect')).revision});
 await create('Source.engineer.json');const source=f.adapter.doc,sourceEntry=w.entry(w.activeId),first=await series(source).read();
 await series(source).create({expectedRevision:source.value.revision,name:'Second'});source.value.metadata.notes='Main edited';source.value.revision++;
 await create('Assembly.engineer.json');const consumer=f.adapter.doc;
 const insert=async()=>f.call('workspace.action',{action:'insert',id:sourceEntry.id,documentId:consumer.value.documentId,expectedDocumentRevision:consumer.value.revision});
 const a=(await insert()).insertedInstanceId,b=(await insert()).insertedInstanceId;assert.equal(consumer.value.native.graph.instances.length,2);
 await f.call('workspace.action',{action:'component-version-set',instanceId:a,selection:first.mainId,documentId:consumer.value.documentId,expectedDocumentRevision:consumer.value.revision});
 let rows=await w.versionBindings.rows(consumer);assert.equal(rows.find(r=>r.id===a).selection,first.mainId);assert.equal(rows.find(r=>r.id===b).selection,'Latest');
 const live=consumer.value.native.graph.dependencies.find(d=>d.id===consumer.value.native.graph.instances.find(i=>i.id===b).dependencyId);assert.equal(live.snapshot.metadata.notes,'Main edited');
 await series(source).remove({expectedRevision:source.value.revision,nodeId:first.mainId});await w.refreshWorkingReferences(consumer);
 rows=await w.versionBindings.rows(consumer);const replaced=rows.find(r=>r.id===a);assert.ok(replaced.notice);assert.notEqual(replaced.selection,first.mainId);
 await f.call('workspace.action',{action:'component-version-ack',instanceId:a,documentId:consumer.value.documentId,expectedDocumentRevision:consumer.value.revision});
 assert.equal((await w.versionBindings.rows(consumer)).find(r=>r.id===a).notice,null);await w.refreshWorkingReferences(consumer);assert.equal((await w.versionBindings.rows(consumer)).find(r=>r.id===a).notice,null);
 await consumer.save(consumer.value.revision);assert.equal(consumer.status().dirty,false);
});

test('automatic Main changes that lose a mating face retain the previous geometry until a choice; stale choices reject',async t=>{
 const f=await fixture(t,{projectContainers:true}),demos=await f.call('project.demos',{destination:f.folder,demoIds:['e4-m5-assembly-analysis']});await f.call('project.open',{path:demos.projects[0].path});const w=f.adapter.workspace,assembly=f.adapter.doc,pin=(await w.load(w.catalog.value.files.find(e=>e.name==='Pin').id)).doc;
 const before=structuredClone(assembly.value),instance=before.native.graph.instances.find(i=>i.id==='pin-0');before.native.graph.spatial.profile=MATE_PROFILE;before.native.graph.spatial.mates.push({id:'fixed-via-face',name:'Fixed via top face',type:'fixed',a:{kind:'face',producerId:'solid',role:'top',occurrencePath:['definition-main','pin-0'],sourceDocumentId:pin.value.documentId},pose:structuredClone(instance.transform)});
 await runWorker('native-verify',{document:before});assembly.native.set(before,assembly.value.revision);
 const oldDependency=assembly.value.native.graph.dependencies.find(d=>d.id===instance.dependencyId),oldEffective=oldDependency.effectiveVersion;
 pin.value.native.graph.features=pin.value.native.graph.features.filter(f=>f.id!=='solid');pin.value.revision++;
 await w.refreshWorkingReferences(assembly);let retained=assembly.value.native.graph.dependencies.find(d=>d.id===instance.dependencyId);assert.equal(retained.effectiveVersion,oldEffective);assert.equal(retained.pendingVersionUpdate.issues.find(i=>i.id==='fixed-via-face').kind,'MissingReference');
 const revision=assembly.value.revision;await w.refreshWorkingReferences(assembly);assert.equal(assembly.value.revision,revision,'An unchanged pending source must not generate repeated revisions.');
 const request=()=>({action:'component-version-set',instanceId:'pin-0',selection:'Latest',documentId:assembly.value.documentId,expectedDocumentRevision:assembly.value.revision});
 const preview=await f.call('workspace.action',request());assert.equal(preview.requiresDecision,true);pin.value.metadata.notes='Changed since decision';pin.value.revision++;
 await assert.rejects(f.call('workspace.action',{...request(),candidateId:preview.candidateId,decision:'retain'}),{code:'RevisionConflict'});
 await f.call('workspace.action',{...request(),decision:'retain'});assert.equal(assembly.value.native.graph.spatial.mates.find(m=>m.id==='fixed-via-face').issue.kind,'MissingReference');await assembly.save(assembly.value.revision);
 await f.call('workspace.action',{...request(),decision:'disable'});assert.equal(assembly.value.native.graph.spatial.mates.find(m=>m.id==='fixed-via-face').disabled,true);await assembly.save(assembly.value.revision);
});

test('exact assembly query aggregates source material for repeated effective occurrences',async t=>{
 const f=await fixture(t,{projectContainers:true}),demos=await f.call('project.demos',{destination:f.folder,demoIds:['e4-m5-assembly-analysis']});await f.call('project.open',{path:demos.projects[0].path});const w=f.adapter.workspace,assembly=f.adapter.doc,pin=(await w.load(w.catalog.value.files.find(e=>e.name==='Pin').id)).doc;
 pin.value.native.graph.definitions[0].material={name:'Aluminium',densityKgM3:2700};pin.value.revision++;await w.refreshWorkingReferences(assembly);
 const result=await f.call('workspace.action',{action:'assembly-analysis',documentId:assembly.value.documentId,expectedDocumentRevision:assembly.value.revision,clearanceMm:1});assert.equal(result.complete,true);assert.equal(result.instanceCount,4);assert.ok(Math.abs(result.massKg-(24000*7850e-9+3*500*Math.PI*2700e-9))<1e-10);assert.ok(result.interferences>=1);assert.ok(result.touching>=1);assert.equal(result.inertiaKgM2.length,3);assert.ok(result.inertiaKgM2.every(row=>row.every(Number.isFinite)));
});

test('agent and human assembly-properties tools share exact bounded read-only projections',async t=>{
 const f=await fixture(t,{projectContainers:true}),demos=await f.call('project.demos',{destination:f.folder,demoIds:['e4-m5-assembly-analysis']});await f.call('project.open',{path:demos.projects[0].path});const doc=f.adapter.doc,s=doc.commands,tool=registry.get('cad.assembly.properties.v1'),grant=s.grant(),actor=s.agent(grant.token),before=doc.value.revision;
 const run=async inputs=>{const {effects,...ctx}=s.context(actor),r=await s.invoke({...ctx,operationId:randomUUID(),traceId:randomUUID(),toolName:tool.name,toolVersion:'1',capability:tool.capability,effectClass:'ReadOnly',inputs},actor);assert.notEqual(r.receipt.outcome,'rejected',JSON.stringify(r.receipt));await s.job.promise;assert.equal(s.job.state,'completed',JSON.stringify(s.job.error));return s.job.result;};
 const summary=await run({projection:'summary',clearanceMm:1});assert.equal(summary.instanceCount,4);assert.equal(summary.complete,false);assert.equal(summary.components,undefined);assert.equal(summary.pairs,undefined);
 const page=await run({projection:'pairs',offset:0,limit:1});assert.equal(page.items.length,1);assert.equal(page.nextOffset,1);assert.equal(page.units.length,'mm');assert.equal(doc.value.revision,before);
});
test('repeated Latest instances share the immutable binding while retaining independent placements and version choices',async t=>{
 const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'Repeated source'});const w=f.adapter.workspace,create=async path=>f.call('workspace.action',{action:'create',kind:'part',path,expectedRevision:(await f.call('workspace.inspect')).revision});await create('Source.engineer.json');const source=w.activeId;await create('Assembly.engineer.json');const doc=f.adapter.doc;
 for(let i=0;i<10;i++)await f.call('workspace.action',{action:'insert',id:source,documentId:doc.value.documentId,expectedDocumentRevision:doc.value.revision});assert.equal(doc.value.native.graph.instances.length,10);assert.equal(doc.value.native.graph.dependencies.length,1);await doc.save(doc.value.revision);
});
