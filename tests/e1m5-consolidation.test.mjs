import test from 'node:test';
import assert from 'node:assert/strict';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {solveParametric} from '../src/sketch/solver.mjs';
import {externalGeometry} from '../src/sketch/external-geometry.mjs';
import {planeFrame} from '../src/sketch/profile.mjs';
import {buildProof} from '../src/proof/kernel.mjs';
import {buildOperationPreview} from '../src/proof/operation-preview.mjs';

const apply=(doc,name,input)=>command(doc,'cad.'+name+'.v1',input);
const makeSketch=(doc,id,plane={kind:'datum',role:'xy'})=>apply(doc,'sketch.create',{sketchId:id,definitionId:'definition-main',name:id,profile:'E1.M5-sketch/1',plane});
const feature=(doc,id)=>doc.native.graph.features.find(f=>f.id===id);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,JSON.stringify({a,b}));
const padInput={featureId:'pad',sketchId:'pad-sketch',name:'Pad',depthMm:7,reverse:false,operation:'add',baseFeatureId:'extrusion-plate'};
async function padSketch(){
 let doc=makeSketch(await extrusionDemo(),'pad-sketch',{kind:'face',producerId:'extrusion-plate',role:'top'});
 return apply(doc,'sketch.entity.add',{sketchId:'pad-sketch',entity:{id:'pad-outline',type:'rectangle',a:[0,0],b:[10,10],construction:false},unit:'mm'});
}
test('refined additive fusion removes coplanar divisions without changing material or inherited source roles',async()=>{
 const source=await padSketch(),candidate=apply(source,'extrusion.create',padInput),legacy=structuredClone(candidate);delete feature(legacy,'pad').data.refined;
 const [raw,refined,base,retainedBase]=await Promise.all([regenerateExtrusions(legacy,{includeMesh:true}),regenerateExtrusions(candidate,{includeMesh:true}),regenerateExtrusions(source,{includeMesh:true}),regenerateExtrusions(candidate,{includeMesh:true,featureId:'extrusion-plate'})]);
 assert.equal(refined.validity.solids,1);close(refined.volumeMm3-base.volumeMm3,700);close(refined.volumeMm3,raw.volumeMm3);close(refined.areaMm2,raw.areaMm2);
 assert.ok(refined.faces.length<raw.faces.length);assert.ok(base.mesh.edges.filter(e=>e.displayHidden).length>=2);
 assert.ok(refined.mesh.edges.some(e=>e.curve?.full&&!e.displayHidden));assert.deepEqual(base.mesh.edges,retainedBase.mesh.edges);
 const downstream=makeSketch(candidate,'downstream',{kind:'face',producerId:'pad',role:'top'});
 assert.equal((await verifyCommand({before:source,after:downstream})).valid,true);
});
test('depth binding and literal replacement are part of one validated extrusion change',async()=>{
 const source=await padSketch(),snapshot=structuredClone(source),candidate=apply(source,'extrusion.create',{...padInput,replaceDepthBinding:true,depthParameterId:'stock-depth'});
 assert.equal(feature(candidate,'pad').data.depthMm,10);assert.equal(candidate.native.graph.parameters.find(p=>p.id==='stock-depth').targets.length,2);
 assert.equal((await verifyCommand({before:source,after:candidate})).valid,true);assert.deepEqual(source,snapshot);
 const literal=apply(candidate,'extrusion.update',{featureId:'pad',name:'Pad',depthMm:12,reverse:false,replaceDepthBinding:true});
 assert.equal(feature(literal,'pad').data.depthMm,12);assert.equal(literal.native.graph.parameters.find(p=>p.id==='stock-depth').targets.length,1);
 assert.equal((await verifyCommand({before:candidate,after:literal})).valid,true);
 assert.throws(()=>apply(candidate,'extrusion.update',{featureId:'pad',name:'Pad',depthMm:12,reverse:false}),{code:'ConstraintConflict'});
});
test('external edges drive mixed relations and point-on-line Snap but cannot take a unary driving constraint',async()=>{
 const doc=makeSketch(await extrusionDemo(),'snap'),scene=(await buildProof(doc,{viewportOnly:true})).scene,o=scene.occurrences[0],edge=scene.models[0].mesh.edges.find(e=>!e.displayHidden&&e.points.length===2&&e.points.every(p=>p[1]===0&&p[2]===10));
 assert.ok(edge);const target={kind:'edge',definitionId:o.definitionId,producerId:o.featureId,role:edge.role,occurrencePath:o.path},geometry=externalGeometry(scene,target,planeFrame(feature(doc,'snap'),doc.native.graph)),external={id:'model-edge',...geometry,referenceOnly:true,external:target};
 const ref={entityId:external.id,role:'entity'};
 assert.throws(()=>apply(doc,'sketch.constraint.add',{sketchId:'snap',externalEntities:[external],constraint:{id:'rejected',type:'horizontal',refs:[ref],driving:true,value:null}}),{code:'InvalidInput'});
 const snapped=apply(doc,'sketch.entity.add',{sketchId:'snap',unit:'mm',externalEntities:[external],entity:{id:'line',type:'line',a:[5,0],b:[12,0],construction:false},snaps:[{fromRole:'a',to:ref}]});
 assert.ok(feature(snapped,'snap').data.constraints.some(c=>c.type==='point-on-line'));
 const parallel=apply(snapped,'sketch.constraint.add',{sketchId:'snap',constraint:{id:'parallel',type:'parallel',refs:[{entityId:'line',role:'entity'},ref],driving:true,value:null}});
 assert.equal((await verifyCommand({before:doc,after:parallel,normalize:true})).valid,true);
});
test('dragging a fixed-center circle changes only free radius',async()=>{
 const c={id:'circle',type:'circle',center:[3,4],radius:2,construction:false},center={id:'center',type:'fixed',refs:[{entityId:c.id,role:'center'}],driving:true,value:[3,4]},radius={id:'r',type:'radius',refs:[{entityId:c.id,role:'entity'}],driving:true,value:2},data={profile:'E1.M5-sketch/1',entities:[c],constraints:[center]},drag={ref:{entityId:c.id,role:'circumference'},target:[3,11]};
 const resized=await solveParametric(data,{drag});assert.equal(resized.valid,true);assert.deepEqual(resized.entities[0].center,c.center);close(resized.entities[0].radius,7);
 const locked=await solveParametric({...data,constraints:[center,radius]},{drag});assert.equal(locked.valid,true);close(locked.entities[0].radius,2);
});

test('an overlapping extrusion retains the intersection edge and its generated vertices',async()=>{
 const source=makeSketch(await extrusionDemo(),'pad-sketch');
 const sketch=apply(source,'sketch.entity.add',{sketchId:'pad-sketch',entity:{id:'overlapping-outline',type:'rectangle',a:[30,5],b:[46,14],construction:false},unit:'mm'});
 const result=await buildProof(apply(sketch,'extrusion.create',{...padInput,depthMm:17}),{viewportOnly:true});
 const mesh=result.scene.models[0].mesh;
 const at=(p,q)=>Math.hypot(...p.map((n,i)=>n-q[i]))<1e-6;
 const start=[30,5,10],end=[40,5,10];
 const edge=mesh.edges.find(e=>e.points.some(p=>at(p,start))&&e.points.some(p=>at(p,end)));
 assert.ok(edge&&!edge.displayHidden,'The concave intersection must remain a visible exact edge');
 for(const target of [start,end])assert.ok(mesh.exactVertices.some(v=>at(v.pointMm,target)&&!v.displayHidden));
});

test('updating an earlier extrusion previews only history through that operation',async()=>{
 const source=await padSketch(),pad=apply(source,'extrusion.create',padInput);
 const downstream=makeSketch(pad,'later-sketch',{kind:'face',producerId:'pad',role:'top'});
 const edited=apply(downstream,'extrusion.update',{featureId:'pad',name:'Pad',depthMm:8,reverse:false});
 const preview=await buildOperationPreview({document:edited,sourceDocument:downstream,rollbackAt:'pad',previewOperation:{name:'cad.extrusion.update.v1',inputs:{featureId:'pad'}}});
 assert.ok(!preview.scene.sketches.some(s=>s.id==='later-sketch'));
 assert.ok((await buildProof(edited,{viewportOnly:true})).scene.sketches.some(s=>s.id==='later-sketch'));
});

test('cylinder seam endpoints retain witnesses but are hidden as vertices',async()=>{
 const result=await buildProof(await extrusionDemo(),{viewportOnly:true});
 const mesh=result.scene.models[0].mesh;
 assert.ok(mesh.exactVertices.some(v=>v.displayHidden));
 assert.ok(mesh.exactVertices.some(v=>!v.displayHidden));
 for(const seam of mesh.edges.filter(e=>e.displayHidden))for(const endpoint of seam.points){
  assert.ok(mesh.exactVertices.some(v=>v.displayHidden&&Math.hypot(...v.pointMm.map((n,i)=>n-endpoint[i]))<1e-6));
 }
});
