import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';
import {command} from '../src/commands/domain.mjs';
import {runWorker} from '../src/lab/jobs.mjs';
import {hash} from '../src/native/schema.mjs';
import {componentTree} from '../src/components/hierarchy.mjs';
import {sceneSelections} from '../src/workbench/model.mjs';
import {M5_PROFILE} from '../src/sketch/relations.mjs';
const run=(d,n,i)=>command(d,'cad.'+n+'.v1',i);
function cylinder(doc,radius){let d=doc.value;d=run(d,'sketch.create',{sketchId:'profile',definitionId:'definition-main',name:'Profile',plane:{kind:'datum',role:'xy'},profile:M5_PROFILE});d=run(d,'sketch.entity.add',{sketchId:'profile',entity:{id:'circle',type:'circle',construction:false,center:[0,0],radius},unit:'mm'});d=run(d,'extrusion.create',{definitionId:'definition-main',featureId:'solid',sketchId:'profile',name:'Cylinder',depthMm:10,reverse:false,operation:'new-body'});doc.native.set(d,doc.value.revision);}
test('independent source files insert verified occurrences, preserve unique model identities, update working sources and reject recursion',async t=>{
 const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'Parts'});
 const action=p=>f.call('workspace.action',p),create=async path=>action({action:'create',kind:'part',path,expectedRevision:(await f.call('workspace.inspect')).revision});
 let w=await create('A.engineer.json'),a=w.created.id,A=f.adapter.doc;cylinder(A,3);
 w=await create('B.engineer.json');const b=w.created.id,B=f.adapter.doc;cylinder(B,5);
 const insert=id=>action({action:'insert',id,documentId:f.adapter.doc.value.documentId,expectedDocumentRevision:f.adapter.doc.value.revision});
 await insert(a);await insert(a);const frozen=hash(B.value.native.graph.dependencies[0].snapshot),tree=componentTree(B.value);
 assert.equal(tree.children.length,2);assert.equal(tree.children[0].name,'A');assert.equal(tree.children[0].sourceDocumentId,A.value.documentId);
 let {result}=await runWorker('drawing-proof',{document:B.value,viewportOnly:true});assert.equal(result.scene.models.length,2);assert.equal(result.scene.occurrences.length,3);assert.equal(new Set(result.scene.models.map(m=>m.definitionId)).size,2);
 const {thumbnailSVG}=await import('../src/workspace/thumbnail.mjs'),thumbnail=thumbnailSVG(result.scene);assert.ok(!thumbnail.includes('NaN'));assert.match(thumbnail,/<polygon[^>]+fill="#[0-9a-f]{6}"/);const external=sceneSelections(result.scene).map(r=>r.item).filter(i=>i.sourceDocumentId===A.value.documentId&&i.kind==='face');assert.ok(external.length>0);assert.ok(external.every(i=>i.definitionId!=='definition-main'));
 await action({action:'open',id:a});await assert.rejects(insert(b),e=>['InvalidDependency','DependencyCycle'].includes(e.code));
 const updated=run(A.value,'extrusion.update',{featureId:'solid',name:'Longer',depthMm:20,reverse:false});A.native.set(updated,A.value.revision);
 await action({action:'open',id:b});assert.notEqual(hash(B.value.native.graph.dependencies[0].snapshot),frozen);
 ({result}=await runWorker('drawing-proof',{document:B.value,viewportOnly:true}));const model=result.scene.models.find(m=>m.sourceDocumentId===A.value.documentId);assert.ok(Math.abs(model.mesh.volumeMm3-180*Math.PI)<1e-5);
 const original=hash(B.value);const path=componentTree(B.value).children[0].path;await action({action:'edit-component',path,documentId:B.value.documentId});assert.equal(f.adapter.doc,A);assert.equal(f.adapter.workspace.activeId,b);const longer=run(A.value,'extrusion.update',{featureId:'solid',name:'In context',depthMm:25,reverse:false});A.native.set(longer,A.value.revision);({result}=await runWorker('drawing-proof',{document:A.value,contextDocument:B.value,viewportOnly:true}));assert.equal(result.revision,A.value.revision);assert.equal(result.scene.models.length,2);assert.equal(hash(B.value),original);await action({action:'exit-component'});assert.equal(f.adapter.doc,B);assert.notEqual(hash(B.value),original);await f.call('document.save',{expectedRevision:B.value.revision});assert.equal(A.status().dirty,false);assert.equal(B.status().dirty,false);await assert.rejects(action({action:'insert',id:a,documentId:A.value.documentId,expectedDocumentRevision:B.value.revision}),{code:'DocumentContextChanged'});
 await action({action:'open',id:a});const edited=run(f.adapter.doc.value,'extrusion.update',{featureId:'solid',name:'Discard me',depthMm:30,reverse:false});f.adapter.doc.native.set(edited,f.adapter.doc.value.revision);await action({action:'open',id:b});assert.equal(B.value.native.graph.dependencies[0].snapshot.graph.features.find(f=>f.id==='solid').data.depthMm,30);await action({action:'close',id:a,decision:'discard'});assert.equal(B.value.native.graph.dependencies[0].snapshot.graph.features.find(f=>f.id==='solid').data.depthMm,25);
});
