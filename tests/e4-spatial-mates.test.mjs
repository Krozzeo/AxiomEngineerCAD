import test from 'node:test';
import assert from 'node:assert/strict';
import {blank} from '../src/document.mjs';
import {upgrade,hash} from '../src/native/schema.mjs';
import {createComponentDefinition,insertComponentInstance,componentTree} from '../src/components/hierarchy.mjs';
import {solveNativeAssembly} from '../src/assembly/native.mjs';
import {verifyNative} from '../src/native/verify.mjs';
const ref=(d,id,role)=>({kind:'datum',producerId:'reference-frame',role,sourceDocumentId:d.documentId,occurrencePath:['definition-main',id]});
function fixture(){let d=upgrade(blank('M2 native assembly'));d=createComponentDefinition(d,{id:'pin',name:'Pin'});for(const [id,position]of [['a',[0,0,0]],['b',[10,0,5]]])d=insertComponentInstance(d,{id,definitionId:'pin',ownerDefinitionId:'definition-main',transform:{position,quaternion:[0,0,0,1]}});d.native.graph.spatial={profile:'E4.M2-spatial/1',grounded:[['definition-main','a']],mates:[]};return d;}
function mate(d,id,type,role,value){d.native.graph.spatial.mates.push({id,name:id,type,a:ref(d,'a',role),b:ref(d,'b',role),...(value===undefined?{}:{value})});return d;}
test('native occurrence mates solve actual datum identities, DOF and constrained motion; persist verified placements',async()=>{
 let d=fixture();let r=await solveNativeAssembly(d);assert.equal(r.diagnostics.remainingDOF,6);assert.deepEqual(r.diagnostics.components.map(c=>c.remainingDOF),[0,6]);
 d=mate(d,'concentric','concentric','z');r=await solveNativeAssembly(d);assert.equal(r.diagnostics.applicable,true);assert.equal(r.diagnostics.remainingDOF,2);d=r.document;assert.ok(Math.abs(componentTree(d).children[1].placement.position[0])<1e-6);
 d=mate(d,'spacing','distance','xy',5);r=await solveNativeAssembly(d);assert.equal(r.diagnostics.remainingDOF,1);assert.equal(r.diagnostics.currentSatisfied,true);d=r.document;
 const evidence=await verifyNative(d);assert.equal(evidence.valid,true);assert.ok(evidence.featureEvidence.some(e=>e.id==='native-assembly-mates'&&e.dof===1));
 const before=hash(d);r=await solveNativeAssembly(d,{targets:[{path:['definition-main','b'],pose:{position:[3,0,5],quaternion:[0,0,0,1]}}]});assert.equal(r.diagnostics.applicable,false);assert.equal(hash(r.document),before);
 r=await solveNativeAssembly(d,{targets:[{path:['definition-main','b'],pose:{position:[0,0,5],quaternion:[0,0,Math.SQRT1_2,Math.SQRT1_2]}}]});assert.equal(r.diagnostics.applicable,true);assert.ok(Math.abs(componentTree(r.document).children[1].placement.quaternion[2]-Math.SQRT1_2)<1e-6);
 const roundtrip=JSON.parse(JSON.stringify(d));assert.equal((await solveNativeAssembly(roundtrip)).diagnostics.remainingDOF,1);
});
test('contradictory/redundant/lost native mates are diagnosed without retargeting or committing infeasible placements',async()=>{
 let d=mate(fixture(),'spacing','distance','xy',5);d=(await solveNativeAssembly(d)).document;d=mate(d,'duplicate','distance','xy',5);let r=await solveNativeAssembly(d);assert.equal(r.diagnostics.status,'RedundantConsistent');assert.ok(r.diagnostics.redundant.includes('duplicate'));
 d=mate(d,'contradiction','distance','xy',10);const before=hash(d);r=await solveNativeAssembly(d);assert.equal(r.diagnostics.applicable,false);assert.equal(hash(r.document),before);await assert.rejects(()=>verifyNative(d),{code:'ConstraintConflict'});
 d.native.graph.spatial.mates[0].a.role='missing-native-plane';await assert.rejects(()=>solveNativeAssembly(d),{code:'LostReference'});
});
test('native parallel, perpendicular, coincident and angle relations resolve through occurrence reference frames',async()=>{
 for(const [type,role,value]of [['parallel','xy'],['perpendicular','xy'],['coincident','xy'],['angle','xy',45],['angle','xy',0],['angle','xy',180]]){const d=mate(fixture(),type,type,role,value),r=await solveNativeAssembly(d);assert.equal(r.diagnostics.applicable,true,type+' '+r.diagnostics.status);assert.equal(r.diagnostics.currentSatisfied,type==='parallel'||type==='angle'&&value===0,type);}
});

test('exact cylindrical faces and fixed relative component frames use actual native geometry',async()=>{
 const {workspaceMateDemo}=await import('../src/workspace/demo.mjs'),{buildProof}=await import('../src/proof/kernel.mjs'),{sceneSelections}=await import('../src/workbench/model.mjs'),{mateReference}=await import('../src/assembly/native-profile.mjs');
 const demo=await workspaceMateDemo();let d=demo.documents[2][1];d.native.graph.spatial.grounded.push(['definition-main','pin-0']);const proof=await buildProof(d,{viewportOnly:true}),entities=sceneSelections(proof.scene).map(r=>r.item),pick=(id,kind,condition=()=>true)=>{const item=entities.find(e=>e.kind===kind&&e.occurrencePath.at(-1)===id&&condition(e));assert.ok(item);return mateReference(item,d.documentId);};
 d.native.graph.spatial.mates.push({id:'cylinder-pair',name:'Exact cylinder axes',type:'concentric',a:pick('pin-0','face',e=>e.referenceGeometry?.kind==='cylinder'),b:pick('pin-1','face',e=>e.referenceGeometry?.kind==='cylinder')});let r=await solveNativeAssembly(d);assert.equal(r.diagnostics.applicable,true);assert.equal(r.diagnostics.remainingDOF,2);
 d=demo.documents[2][1];d.native.graph.spatial.mates=d.native.graph.spatial.mates.filter(m=>m.id!=='cylinder-pair');const before=componentTree(d).children.filter(n=>n.name==='Pin').map(n=>n.placement);d.native.graph.spatial.mates.push({id:'fixed-pair',name:'Fixed relative pair',type:'fixed',a:pick('pin-0','instance'),b:pick('pin-1','instance'),relative:{position:before[1].position.map((x,i)=>x-before[0].position[i]),quaternion:[0,0,0,1]}});r=await solveNativeAssembly(d);assert.equal(r.diagnostics.applicable,true);assert.equal(r.diagnostics.remainingDOF,0);assert.deepEqual(componentTree(r.document).children.filter(n=>n.name==='Pin').map(n=>n.placement),before);await verifyNative(r.document);
});

test('native document import rebinds local mate identity and preserves verified geometry/DOF',async()=>{
 const {importNative}=await import('../src/native/exchange.mjs');let d=mate(fixture(),'aligned','concentric','z');d=(await solveNativeAssembly(d)).document;const target=upgrade(blank('Imported M2'));const imported=await importNative(target,JSON.stringify(d));assert.equal(imported.documentId,target.documentId);assert.ok(imported.native.graph.spatial.mates.every(m=>m.a.sourceDocumentId===target.documentId&&m.b.sourceDocumentId===target.documentId));assert.equal((await solveNativeAssembly(imported)).diagnostics.remainingDOF,2);
});
