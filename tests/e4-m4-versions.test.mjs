import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';
import {series} from '../src/workspace/version-bindings.mjs';
import {hash} from '../src/native/schema.mjs';
test('legacy M4 published data migrates to Main/retained bindings without changing historical effective snapshots',async t=>{
 const f=await fixture(t,{projectContainers:true}),demos=await f.call('project.demos',{destination:f.folder,demoIds:['e4-m4-versioned-assemblies']});await f.call('project.open',{path:demos.projects[0].path});const w=f.adapter.workspace,assembly=f.adapter.doc,before=structuredClone(assembly.value),pinEntry=w.catalog.value.files.find(f=>f.name==='Pin'),pin=(await w.load(pinEntry.id)).doc;
 const historical=await series(assembly).create({expectedRevision:assembly.value.revision,name:'Before Main edit'}),older=historical.history.nodes[1].id;
 const oldSnapshot=hash((await series(assembly).snapshot(older)).document.native.graph.dependencies),find=(doc,id)=>doc.native.graph.dependencies.find(d=>d.id===doc.native.graph.instances.find(i=>i.id===id).dependencyId);
 assert.equal(find(before,'pin-0').policy,'Latest');assert.equal(find(before,'pin-1').policy,'Pinned');
 pin.value.native.graph.features.find(f=>f.id==='solid').data.depthMm=25;pin.value.revision++;await w.refreshWorkingReferences(assembly);
 assert.equal(find(assembly.value,'pin-0').snapshot.graph.features.find(f=>f.id==='solid').data.depthMm,25);assert.equal(find(assembly.value,'pin-1').snapshot.graph.features.find(f=>f.id==='solid').data.depthMm,20);
 assert.equal(hash((await series(assembly).snapshot(older)).document.native.graph.dependencies),oldSnapshot);
 await assembly.save(assembly.value.revision);assert.equal(assembly.status().dirty,false);assert.equal(pin.value.native.publications.length,1,'Legacy publication records remain intact as historical data.');
});
