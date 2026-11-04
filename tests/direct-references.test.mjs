import test from 'node:test';
import assert from 'node:assert/strict';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {buildProof} from '../src/proof/kernel.mjs';
import {externalGeometry} from '../src/sketch/external-geometry.mjs';
import {planeFrame} from '../src/sketch/profile.mjs';

async function fixture(){
 let value=command(await extrusionDemo(),'cad.sketch.create.v1',{sketchId:'direct',definitionId:'definition-main',name:'Direct refs',plane:{kind:'datum',role:'xy'},profile:'E1.M5-sketch/1'});
 value=command(value,'cad.sketch.entity.add.v1',{sketchId:'direct',entity:{id:'local',type:'point',point:[10,4],construction:false},unit:'mm'});
 const feature=value.native.graph.features.find(f=>f.id==='direct'),scene=(await buildProof(value,{viewportOnly:true,rollbackAt:'direct'})).scene,target={kind:'datum',definitionId:'definition-main',producerId:'reference-frame',role:'origin',occurrencePath:['definition-main']};
 const external={id:'implicit-origin',...externalGeometry(scene,target,planeFrame(feature,value.native.graph)),external:target,referenceOnly:true};return {value,external};
}
test('one constraint materializes only its used reference; deleting the last relation removes internal anchors',async()=>{
 const {value,external}=await fixture(),before=structuredClone(value),constraint={id:'direct-distance',type:'distance-x',refs:[{entityId:external.id,role:'point'},{entityId:'local',role:'point'}],driving:true,value:10};
 const after=command(value,'cad.sketch.constraint.add.v1',{sketchId:'direct',constraint,externalEntities:[external]}),proof=await verifyCommand({before:value,after,normalize:true});assert.equal(proof.valid,true);assert.deepEqual(value,before);
 const feature=proof.candidate.native.graph.features.find(f=>f.id==='direct');assert.equal(feature.data.entities.filter(e=>e.referenceOnly).length,1);assert.ok(feature.data.constraints.some(c=>c.type==='fixed'&&c.refs[0].entityId===external.id));
 const removed=command(proof.candidate,'cad.sketch.constraint.delete.v1',{sketchId:'direct',constraintId:constraint.id}),clean=removed.native.graph.features.find(f=>f.id==='direct');assert.equal(clean.data.entities.some(e=>e.referenceOnly),false);assert.equal(clean.data.constraints.length,0);assert.deepEqual(removed.native.versions,value.native.versions);
});
test('unreferenced or forged implicit data cannot change source; geometry is independently verified',async()=>{
 const {value,external}=await fixture(),before=structuredClone(value),constraint={id:'direct-distance',type:'distance-x',refs:[{entityId:external.id,role:'point'},{entityId:'local',role:'point'}],driving:true,value:10};
 assert.throws(()=>command(value,'cad.sketch.constraint.add.v1',{sketchId:'direct',constraint:{...constraint,refs:[{entityId:'local',role:'point'}]},externalEntities:[external]}),{code:'InvalidInput'});
 const forged=structuredClone(external);forged.point[0]=50;const after=command(value,'cad.sketch.constraint.add.v1',{sketchId:'direct',constraint,externalEntities:[forged]});await assert.rejects(()=>verifyCommand({before:value,after,normalize:true}),e=>e.code==='LostReference');assert.deepEqual(value,before);
});
