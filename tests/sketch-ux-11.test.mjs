import {circleWitness,closedCircularBoundary} from '../src/sketch/curve-witness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {buildProof} from '../src/proof/kernel.mjs';
import {buildOperationPreview} from '../src/proof/operation-preview.mjs';
import {externalGeometry} from '../src/sketch/external-geometry.mjs';
import {planeFrame} from '../src/sketch/profile.mjs';

const create=(v,id='review')=>command(v,'cad.sketch.create.v1',{sketchId:id,definitionId:'definition-main',name:'Review',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
async function sourceFixture(){const doc=create(await extrusionDemo()),scene=(await buildProof(doc,{viewportOnly:true})).scene,feature=doc.native.graph.features.find(f=>f.id==='review'),o=scene.occurrences[0];return {doc,scene,feature,target:edge=>({kind:'edge',definitionId:o.definitionId,producerId:o.featureId,occurrencePath:o.path,role:edge.role})};}

test('extrusion preview preserves the original model and contributes only its exact tool volume',async()=>{
 let source=await extrusionDemo();source=command(source,'cad.sketch.create.v1',{sketchId:'pad-sketch',definitionId:'definition-main',name:'Pad',profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'extrusion-plate',role:'top'}});
 source=command(source,'cad.sketch.entity.add.v1',{sketchId:'pad-sketch',entity:{id:'pad-outline',type:'rectangle',a:[5,5],b:[15,15],construction:false},unit:'mm'});
 const operation={name:'cad.extrusion.create.v1',inputs:{featureId:'pad',sketchId:'pad-sketch',name:'Pad',depthMm:7,reverse:false,operation:'add',baseFeatureId:'extrusion-plate'}},snapshot=structuredClone(source),candidate=command(source,operation.name,operation.inputs),base=await buildProof(source,{viewportOnly:true}),preview=await buildOperationPreview({document:candidate,sourceDocument:source,previewOperation:operation});
 assert.deepEqual(source,snapshot);assert.equal(preview.scene.models[0].mesh.volumeMm3,base.scene.models[0].mesh.volumeMm3);assert.equal(preview.scene.previewLayers.length,1);assert.ok(Math.abs(preview.exact.volumeMm3-base.exact.volumeMm3-700)<1e-5);
 const z=preview.scene.previewLayers[0].mesh.vertices.filter((_,i)=>i%3===2);assert.ok(Math.abs(Math.min(...z)-10)<1e-6);assert.ok(Math.abs(Math.max(...z)-17)<1e-6);
});

test('kernel circles expose a verified source center and project as circles',async()=>{
 const {doc,scene,feature,target}=await sourceFixture(),circles=scene.models[0].mesh.edges.filter(e=>e.curve?.type==='circle');assert.ok(circles.length>=2);const top=scene.models[0].mesh.faces.find(f=>f.role==='top');assert.equal(top.edgeRoles.length,5);assert.ok(top.edgeRoles.every(role=>scene.models[0].mesh.edges.some(e=>e.role===role)));
 for(const edge of circles){assert.ok(Math.abs(edge.curve.radiusMm-3)<1e-6);const geometry=externalGeometry(scene,target(edge),planeFrame(feature,doc.native.graph));assert.equal(geometry.type,'circle');assert.ok(Math.hypot(geometry.center[0]-20,geometry.center[1]-15)<1e-6);assert.ok(Math.abs(geometry.radius-3)<1e-6);}
});

test('Convert Entities is one atomic batch of normal geometry with removable projection relations',async()=>{
 const {doc,scene,feature,target}=await sourceFixture(),mesh=scene.models[0].mesh,edges=[mesh.edges.find(e=>e.curve?.type==='circle'),mesh.edges.find(e=>e.points.length===2)],entities=edges.map((edge,i)=>({id:'conversion-'+i,...externalGeometry(scene,target(edge),planeFrame(feature,doc.native.graph)),construction:false,external:target(edge),converted:true}));
 const after=command(doc,'cad.sketch.entities.add.v1',{sketchId:'review',entities,unit:'mm'}),verified=await verifyCommand({before:doc,after,normalize:true});assert.equal(verified.valid,true);
 const sketch=verified.candidate.native.graph.features.find(f=>f.id==='review');assert.ok(sketch.data.entities.every(e=>!e.construction&&e.converted));assert.ok(sketch.data.constraints.every(c=>c.name==='On edge'));
 const anchor=sketch.data.constraints.find(c=>c.refs[0].entityId===entities[0].id),detached=command(verified.candidate,'cad.sketch.constraint.delete.v1',{sketchId:'review',constraintId:anchor.id}),e=detached.native.graph.features.find(f=>f.id==='review').data.entities[0];assert.equal(e.external,undefined);assert.equal(e.converted,undefined);assert.equal(e.construction,false);
 const forged=structuredClone(entities);forged[0].radius=8;await assert.rejects(()=>verifyCommand({before:doc,after:command(doc,'cad.sketch.entities.add.v1',{sketchId:'review',entities:forged,unit:'mm'}),normalize:true}),error=>error.code==='LostReference');assert.equal(doc.native.graph.features.find(f=>f.id==='review').data.entities.length,0);
});

test('implicit external geometry is absent from the sketch scene outside editing',async()=>{
 const {doc,scene,feature,target}=await sourceFixture(),edge=scene.models[0].mesh.edges.find(e=>e.points.length===2&&Math.hypot(e.points[0][0]-e.points[1][0],e.points[0][1]-e.points[1][1])>1),entity={id:'implicit',...externalGeometry(scene,target(edge),planeFrame(feature,doc.native.graph)),referenceOnly:true,external:target(edge)};
 let next=command(doc,'cad.sketch.entity.add.v1',{sketchId:'review',entity:{id:'local',type:'point',point:[4,5],construction:true},unit:'mm'});
 next=command(next,'cad.sketch.constraint.add.v1',{sketchId:'review',externalEntities:[entity],constraint:{id:'measure',type:'distance',refs:[{entityId:'local',role:'point'},{entityId:entity.id,role:'a'}],driving:false,value:0}});
 const proof=await buildProof(next,{viewportOnly:true});assert.equal(proof.scene.sketches.find(s=>s.id==='review').entities.some(e=>e.id==='implicit'),false);
});

test('an incomplete arc or repeated semicircle cannot masquerade as a full circular boundary',()=>{
 const arc=(a,b)=>({points:Array.from({length:33},(_,i)=>{const t=a+(b-a)*i/32;return [20+3*Math.cos(t),15+3*Math.sin(t),10];}),lengthMm:3*(b-a)}),first=arc(0,Math.PI),second=arc(Math.PI,2*Math.PI),curve=circleWitness(first.points);
 assert.ok(curve);assert.equal(closedCircularBoundary([first],curve),null);assert.equal(closedCircularBoundary([first,first],curve),null);assert.ok(closedCircularBoundary([first,second],curve));
});
