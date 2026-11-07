import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraBasis,normalView,orbitCamera} from '../app/cad-camera.mjs';
import {externalGeometry} from '../src/sketch/external-geometry.mjs';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyNative} from '../src/native/verify.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {buildProof} from '../src/proof/kernel.mjs';
import {planeFrame} from '../src/sketch/profile.mjs';
import {solveParametric} from '../src/sketch/solver.mjs';

test('screen-relative orbit preserves the camera frame through poles and rolled sketch views',()=>{
 const near=(a,b)=>a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<1e-8));
 for(const normal of [[0,0,1],[1,0,0],[0,-1,0]])for(const roll of [0,Math.PI/2,Math.PI]){
  const start={...normalView(normal),roll},basis=cameraBasis(start);let camera=start;
  for(let i=0;i<360;i++)camera=orbitCamera(camera,0,Math.PI/1.8);
  const end=cameraBasis(camera);near(end.toward,basis.toward);near(end.right,basis.right);
  const horizontal=cameraBasis(orbitCamera(start,10,0));assert.ok(Math.abs(horizontal.toward.reduce((s,x,i)=>s+x*basis.up[i],0))<1e-8);
  near(cameraBasis(orbitCamera(orbitCamera(start,12,19),-12,-19)).toward,basis.toward);
 }
});

test('axis snap is atomic and Shift-chain endpoint coincidence survives solving',async()=>{
 let value=command(await extrusionDemo(),'cad.sketch.create.v1',{sketchId:'practice',definitionId:'definition-main',name:'Practice',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
 value=command(value,'cad.sketch.entity.add.v1',{sketchId:'practice',entity:{id:'first',type:'line',a:[0,0],b:[10,0],construction:false},unit:'mm',alignment:'horizontal'});
 value=command(value,'cad.sketch.entity.add.v1',{sketchId:'practice',entity:{id:'second',type:'line',a:[10,0],b:[10,12],construction:false},unit:'mm',alignment:'vertical',snaps:[{fromRole:'a',to:{entityId:'first',role:'b'}}]});
 const f=value.native.graph.features.find(f=>f.id==='practice'),solved=await solveParametric(f.data);
 assert.equal(solved.valid,true);assert.ok(f.data.constraints.some(c=>c.type==='horizontal'));assert.ok(f.data.constraints.some(c=>c.type==='vertical'));assert.ok(f.data.constraints.some(c=>c.type==='coincident'));
});

test('external exact references persist, constrain sketch geometry and reject forged or stale coordinates',async()=>{
 let value=command(await extrusionDemo(),'cad.sketch.create.v1',{sketchId:'external-practice',definitionId:'definition-main',name:'External practice',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
 const f=value.native.graph.features.find(f=>f.id==='external-practice'),frame=planeFrame(f,value.native.graph),proof=await buildProof(value,{viewportOnly:true,rollbackAt:f.id}),o=proof.scene.occurrences[0],mesh=proof.scene.models[0].mesh;
 const targets=[{kind:'datum',definitionId:'definition-main',producerId:'reference-frame',role:'origin',occurrencePath:['definition-main']},{kind:'face',definitionId:o.definitionId,producerId:o.featureId,role:mesh.faces.find(f=>f.planeNormal)?.role,occurrencePath:o.path}];
 if(mesh.exactVertices.length)targets.push({kind:'vertex',definitionId:o.definitionId,producerId:o.featureId,role:mesh.exactVertices[0].role,occurrencePath:o.path});
 const straight=mesh.edges.find(e=>e.points.length===2&&!e.role.startsWith('transient-'));if(straight)targets.push({kind:'edge',definitionId:o.definitionId,producerId:o.featureId,role:straight.role,occurrencePath:o.path});
 for(const [i,target]of targets.entries())value=command(value,'cad.sketch.entity.add.v1',{sketchId:f.id,unit:'mm',entity:{id:'reference-'+i,...externalGeometry(proof.scene,target,frame),external:target}});
 value=command(value,'cad.sketch.entity.add.v1',{sketchId:f.id,unit:'mm',entity:{id:'local-point',type:'point',point:[10,4],construction:false}});
 value=command(value,'cad.sketch.constraint.add.v1',{sketchId:f.id,constraint:{id:'external-distance',type:'distance-x',refs:[{entityId:'reference-0',role:'point'},{entityId:'local-point',role:'point'}],driving:true,value:10}});
 assert.equal((await verifyNative(value)).valid,true);
 const changed=command(value,'cad.parameter.set.v1',{parameter:{id:'stock-width',name:'StockWidth',expression:'45 mm',definitionId:null,unit:'mm',description:'Plate profile size'}});
 await assert.rejects(()=>verifyCommand({before:value,after:changed,normalize:true}),e=>e.code==='LostReference');
 const forged=structuredClone(value),entity=forged.native.graph.features.find(x=>x.id===f.id).data.entities[0];entity.point[0]+=1;
 await assert.rejects(()=>verifyNative(forged),e=>e.code==='LostReference');
 const lost=structuredClone(value);lost.native.graph.features.find(x=>x.id===f.id).data.entities[0].external.role='missing';await assert.rejects(()=>verifyNative(lost),e=>e.code==='LostReference');
 const externalFeature=value.native.graph.features.find(x=>x.id===f.id);for(const e of [...externalFeature.data.entities])value=command(value,'cad.sketch.entity.delete.v1',{sketchId:f.id,entityId:e.id});
 assert.deepEqual(value.native.graph.features.find(x=>x.id===f.id).dependsOn,[]);
});
