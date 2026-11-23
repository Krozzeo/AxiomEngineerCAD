import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture} from './helpers.mjs';
import {blank} from '../src/document.mjs';
import {upgrade} from '../src/native/schema.mjs';
import {createComponentDefinition,insertComponentInstance,componentTree} from '../src/components/hierarchy.mjs';
import {moveComponents,reparentComponent,retainMovedGroupFrames} from '../src/components/motion.mjs';
import {duplicateComponents} from '../src/components/copy.mjs';
import {visibleEdges} from '../src/workspace/thumbnail.mjs';
test('thumbnail clipping removes only the depth-hidden part of native projected edges',()=>{
 const face=[[0,0,2],[10,0,2],[0,10,2]];
 assert.deepEqual(visibleEdges([[[1,1,1],[2,2,1]]],[face]),[]);
 assert.deepEqual(visibleEdges([[[1,1,3],[2,2,3]]],[face]),[[[1,1,3],[2,2,3]]]);
 assert.deepEqual(visibleEdges([[[1,1,2],[2,2,2]]],[face]),[[[1,1,2],[2,2,2]]]);
 const partial=visibleEdges([[[-1,1,1],[5,1,1]]],[face]);assert.equal(partial.length,1);assert.ok(Math.abs(partial[0][1][0])<1e-7);
});
test('renaming an open part updates its native name, file path, consumers and saved path; unchanged rename is harmless',async t=>{
 const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'M2 files'});const act=p=>f.call('workspace.action',p);let w=await f.call('workspace.inspect');w=await act({action:'create',kind:'part',path:'Pin.engineer.json',expectedRevision:w.revision});const pin=w.created.id,source=f.adapter.doc;
 w=await act({action:'create',kind:'part',path:'Assembly.engineer.json',expectedRevision:w.revision});const assembly=f.adapter.doc,aid=w.created.id;await act({action:'insert',id:pin,documentId:assembly.value.documentId,expectedDocumentRevision:assembly.value.revision});
 w=await f.call('workspace.inspect');const noChange=await act({action:'move',path:'Pin.engineer.json',to:'Pin.engineer.json',expectedRevision:w.revision});assert.equal(noChange.revision,w.revision);
 w=await act({action:'move',path:'Pin.engineer.json',to:'Renamed pin.engineer.json',expectedRevision:w.revision});assert.equal(w.files.find(x=>x.id===pin).name,'Renamed pin');assert.equal(source.value.metadata.name,'Renamed pin');assert.equal(source.path,join(f.folder,'Renamed pin.engineer.json'));assert.equal(assembly.value.native.graph.dependencies[0].snapshot.metadata.name,'Renamed pin');assert.equal(assembly.value.native.graph.dependencies[0].locator,'Renamed pin.engineer.json');await assert.rejects(access(join(f.folder,'Pin.engineer.json')),{code:'ENOENT'});
 await act({action:'open',id:pin});await f.call('document.save',{expectedRevision:source.value.revision});await act({action:'close',id:pin,decision:'discard'});await act({action:'open',id:pin});assert.equal(f.adapter.doc.value.metadata.name,'Renamed pin');await act({action:'open',id:aid});
 w=await f.call('workspace.inspect');w=await act({action:'copy-part',sourceDocumentId:source.value.documentId,folder:'',expectedRevision:w.revision});w=await act({action:'copy-part',sourceDocumentId:source.value.documentId,folder:'',expectedRevision:w.revision});const copies=w.files.filter(x=>x.name.startsWith('Renamed pin ('));assert.deepEqual(copies.map(x=>x.name),['Renamed pin (1)','Renamed pin (2)']);assert.equal(new Set([source.value.documentId,...copies.map(x=>x.documentId)]).size,3);
});
function grouped(){let d=upgrade(blank('Groups'));d=createComponentDefinition(d,{id:'group',kind:'assembly',name:'Group'});d=createComponentDefinition(d,{id:'part',name:'Part'});d=insertComponentInstance(d,{id:'outer',definitionId:'group',transform:{position:[10,0,0],quaternion:[0,0,0,1]}});for(const [id,x]of [['a',-2],['b',2]])d=insertComponentInstance(d,{id,definitionId:'part',ownerDefinitionId:'group',transform:{position:[x,0,0],quaternion:[0,0,0,1]}});return d;}
test('deep group duplication keeps child placements and shared part definitions but independent group identities',()=>{
 const d=grouped(),copy=duplicateComponents(d,[['definition-main','outer']]),tree=componentTree(copy);assert.equal(tree.children.length,2);assert.notEqual(tree.children[0].definitionId,tree.children[1].definitionId);assert.equal(copy.native.graph.definitions.filter(d=>d.kind==='part'&&d.id==='part').length,1);assert.deepEqual(tree.children[0].children.map(n=>n.placement),tree.children[1].children.map(n=>n.placement));assert.notDeepEqual(tree.children[0].children.map(n=>n.instanceId),tree.children[1].children.map(n=>n.instanceId));
});
test('manual multi-component pivot motion is a rigid world delta and native mate paths survive organization',()=>{
 let d=grouped(),paths=componentTree(d).children[0].children.map(n=>n.path);d=moveComponents(d,{paths,manual:true,pivot:[10,0,0],mode:'rotate',frame:'absolute',values:[0,0,90]});let nodes=componentTree(d).children[0].children;assert.ok(Math.abs(nodes[0].placement.position[0]-10)<1e-8);assert.ok(Math.abs(nodes[0].placement.position[1]+2)<1e-8);assert.ok(Math.abs(nodes[1].placement.position[1]-2)<1e-8);
 d.native.graph.spatial={profile:'E4.M2-spatial/1',grounded:[paths[0]],mates:[]};d=reparentComponent(d,{path:paths[0],parentPath:['definition-main']});assert.deepEqual(d.native.graph.spatial.grounded,[['definition-main','a']]);
});

test('a constrained group motion retains its organization frame without applying the child delta twice',async()=>{
 const {solveNativeAssembly}=await import('../src/assembly/native.mjs');const d=grouped();d.native.graph.spatial={profile:'E4.M2-spatial/1',grounded:[],mates:[]};const candidate=moveComponents(d,{paths:[['definition-main','outer']],mode:'translate',manual:true,frame:'absolute',values:[5,0,0]}),desired=componentTree(candidate).children[0].children;
 const result=await solveNativeAssembly(d,{targets:desired.map(n=>({path:n.path,pose:n.placement}))});assert.equal(result.diagnostics.applicable,true);const retained=retainMovedGroupFrames(result.document,candidate),tree=componentTree(retained);assert.deepEqual(tree.children[0].placement.position,[15,0,0]);for(let i=0;i<2;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(tree.children[0].children[i].placement.position[k]-desired[i].placement.position[k])<1e-6);
});

test('clipboard source document identity prevents same-named destination instance retargeting across assemblies',async()=>{
 const source=grouped(),target=grouped();source.native.graph.instances.find(i=>i.id==='outer').transform.position=[100,0,0];const result=duplicateComponents(target,[['definition-main','outer']],{source}),tree=componentTree(result);assert.equal(tree.children.length,2);assert.equal(tree.children[0].placement.position[0],10);assert.equal(tree.children[1].placement.position[0],100);assert.notEqual(tree.children[0].children[0].definitionId,tree.children[1].children[0].definitionId);const {verifyNative}=await import('../src/native/verify.mjs');await verifyNative(result);
});

test('workspace paste across part files preserves the selected source dependency and world placement',async t=>{
 const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'Cross file clipboard'});const act=p=>f.call('workspace.action',p);let w=await f.call('workspace.inspect');w=await act({action:'create',kind:'part',path:'Source part.engineer.json',expectedRevision:w.revision});const part=w.created.id,partDocument=f.adapter.doc.value.documentId;w=await act({action:'create',kind:'part',path:'Source assembly.engineer.json',expectedRevision:w.revision});const source=f.adapter.doc;await act({action:'insert',id:part,documentId:source.value.documentId,expectedDocumentRevision:source.value.revision});const instance=source.value.native.graph.instances[0];await act({action:'move-components',paths:[['definition-main',instance.id]],mode:'translate',frame:'absolute',values:[15,3,2],documentId:source.value.documentId,expectedDocumentRevision:source.value.revision});w=await f.call('workspace.inspect');w=await act({action:'create',kind:'part',path:'Target assembly.engineer.json',expectedRevision:w.revision});const target=f.adapter.doc;await act({action:'duplicate-components',sourceAssemblyDocumentId:source.value.documentId,paths:[['definition-main',instance.id]],documentId:target.value.documentId,expectedDocumentRevision:target.value.revision});const tree=componentTree(target.value);assert.equal(tree.children.length,1);assert.equal(tree.children[0].sourceDocumentId,partDocument);assert.deepEqual(tree.children[0].placement.position,[15,3,2]);assert.equal(source.value.native.graph.instances.length,1);
});

test('Project clipboard extracts an internal leaf part rather than copying its enclosing assembly',async t=>{
 const f=await fixture(t,{projectContainers:true});await f.call('project.create',{path:f.folder,name:'Internal part copy'});const act=p=>f.call('workspace.action',p);let w=await f.call('workspace.inspect');await act({action:'create',kind:'part',path:'Assembly.engineer.json',expectedRevision:w.revision});const source=f.adapter.doc,d=grouped();d.documentId=source.value.documentId;source.native.set(d,source.value.revision);w=await f.call('workspace.inspect');w=await act({action:'copy-part',sourceDocumentId:source.value.documentId,sourceDefinitionId:'part',folder:'',expectedRevision:w.revision});const file=w.files.find(f=>f.name==='Part (1)');assert.ok(file);await act({action:'open',id:file.id});assert.equal(f.adapter.doc.value.native.graph.primaryDefinitionId,'part');assert.equal(f.adapter.doc.value.native.graph.instances.length,0);assert.equal(f.adapter.doc.value.native.graph.definitions.length,1);assert.notEqual(f.adapter.doc.value.documentId,source.value.documentId);assert.equal(source.value.native.graph.instances.length,3);
});
