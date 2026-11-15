import test from 'node:test';import assert from 'node:assert/strict';
import {constructReference,inferReferenceRelations,referenceRelations,dot} from '../src/reference/geometry.mjs';
import {blank} from '../src/document.mjs';import {upgrade} from '../src/native/schema.mjs';import {command} from '../src/commands/domain.mjs';import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';import {referenceDatums} from '../src/reference/profile.mjs';
const plane={kind:'plane',origin:[0,0,0],normal:[0,0,1],u:[1,0,0],v:[0,1,0]},line={kind:'line',origin:[2,3,7],direction:[1,0,0],a:[2,3,7],b:[12,3,7]},entry=(geometry,relation='coincident',value=0)=>({geometry,relation,value});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
test('Plane orientation and the second reference location are solved together',()=>{
 for(const [relation,value]of [['parallel',0],['perpendicular',0],['angle',35]]){
  const result=constructReference('plane',[entry(plane,relation,value),entry(line)]);close(dot(result.normal,line.direction),0);close(dot(result.normal,result.origin.map((n,i)=>n-line.origin[i])),0);
  close(Math.abs(dot(result.normal,plane.normal)),relation==='perpendicular'?0:Math.cos(value*Math.PI/180));
 }
 const p=constructReference('plane',[entry(plane,'parallel'),entry({kind:'point',origin:[4,5,9]})]);close(p.origin[2],9);
 assert.throws(()=>constructReference('plane',[entry(plane),entry(line)]),e=>e.code==='ConstraintConflict');
});
test('Midplane inference and manual toggles apply to the shared pair',()=>{
 const second={...plane,origin:[0,0,10]};let entries=inferReferenceRelations('plane',[entry(plane),entry(second)]);assert.deepEqual(entries.map(e=>e.relation),['midplane','midplane']);close(constructReference('plane',entries).origin[2],5);close(constructReference('plane',[entry(plane),entry(second,'midplane')]).origin[2],5);
 entries=inferReferenceRelations('plane',entries,{manualIndex:1,relation:'coincident'});assert.deepEqual(entries.map(e=>e.relation),['parallel','coincident']);
 const allowed=referenceRelations('plane',[entry(plane),entry({...plane,normal:[1,0,0]})],0);assert.equal(allowed.includes('midplane'),false);
});
test('Plane angle rotates about the selected local axis and circular references retain center/tangent semantics',()=>{
 const a=constructReference('plane',[{...entry(plane,'angle',45),angleAxis:'u'}]),b=constructReference('plane',[{...entry(plane,'angle',45),angleAxis:'v'}]);assert.ok(Math.abs(a.normal[0]-b.normal[0])>.5);
 const circle={kind:'circle',origin:[1,2,3],normal:[0,0,1],direction:[0,0,1],radius:4,a:[5,2,3],b:[5,2,3],point:[5,2,3]};
 assert.deepEqual(constructReference('axis',[entry(circle,'center')]).normal,[0,0,1]);assert.deepEqual(constructReference('axis',[entry(circle,'tangent')]).normal,[0,1,0]);close(constructReference('plane',[entry(circle,'tangent')]).origin[0],5);
});
test('Coordinate endpoints, midpoint and orientation have persistent right-handed frames',()=>{
 for(const [relation,x]of [['endpoint-a',2],['endpoint-b',12],['midpoint',7]])close(constructReference('coordinate',[entry(line,relation)]).origin[0],x);
 const ps=[entry({kind:'point',origin:[0,0,0]},'midpoint'),entry({kind:'point',origin:[10,0,0]},'midpoint'),entry({kind:'point',origin:[0,8,0]},'midpoint')];const c=constructReference('coordinate',ps,{primaryAxis:'z',reverse:true,quarterTurns:1});close(c.origin[0],10/3);close(c.origin[1],8/3);close(dot(c.u,c.v),0);
});
const invoke=(d,n,i)=>command(d,'cad.'+n+'.v1',i);
test('Actual cylindrical faces resolve as exact native center and tangent references',async()=>{
 let d=upgrade(blank('Cylinder reference'));
 d=invoke(d,'sketch.create',{sketchId:'s',definitionId:'definition-main',name:'Cylinder',plane:{kind:'datum',role:'xy'},profile:'E1.M5-sketch/1'});
 d=invoke(d,'sketch.entity.add',{sketchId:'s',unit:'mm',entity:{id:'circle',type:'circle',center:[0,0],radius:5,construction:false}});
 d=invoke(d,'extrusion.create',{featureId:'solid',sketchId:'s',name:'Cylinder',depthMm:10,reverse:false,operation:'new-body'});
 const model=await regenerateExtrusions(d,{includeMesh:true}),face=model.mesh.faces.find(f=>f.referenceGeometry?.kind==='cylinder');assert.ok(face);const target={kind:'face',producerId:'solid',definitionId:'definition-main',role:face.role,occurrencePath:['definition-main']};
 for(const [kind,relation]of [['axis','center'],['plane','tangent'],['coordinate','center']])d=invoke(d,'reference.set',{featureId:kind,name:kind,kind,references:[{target,geometry:face.referenceGeometry,relation,value:0}]});
 close((await regenerateExtrusions(d)).volumeMm3,Math.PI*250);assert.deepEqual(referenceDatums(d).find(f=>f.id==='axis').direction,[0,0,1]);
 const forged=structuredClone(d);forged.native.graph.features.find(f=>f.id==='plane').data.references[0].geometry.radius=6;await assert.rejects(()=>regenerateExtrusions(forged),e=>e.code==='LostReference');
});


test('A native conical face supports an associative center axis and tangent/center planes',async()=>{
 let d=upgrade(blank('Conical reference'));d=invoke(d,'sketch.create',{sketchId:'s',definitionId:'definition-main',name:'Cone section',plane:{kind:'datum',role:'xy'},profile:'E1.M5-sketch/1'});
 const points=[[0,0],[2,0],[4,10],[0,10]];
 for(let i=0;i<4;i++)d=invoke(d,'sketch.entity.add',{sketchId:'s',unit:'mm',entity:{id:'line-'+i,type:'line',a:points[i],b:points[(i+1)%4],construction:false}});
 d=invoke(d,'sketch.entity.add',{sketchId:'s',unit:'mm',entity:{id:'axis',type:'line',a:[0,-5],b:[0,15],construction:true}});
 d=invoke(d,'extrusion.create',{featureId:'cone',sketchId:'s',name:'Cone',form:'revolve',axisId:'axis',angleDeg:360,depthMm:10,reverse:false,operation:'new-body'});
 const model=await regenerateExtrusions(d,{includeMesh:true}),face=model.mesh.faces.find(f=>f.referenceGeometry?.kind==='cone');assert.ok(face);
 const target={kind:'face',producerId:'cone',definitionId:'definition-main',role:face.role,occurrencePath:['definition-main']};
 for(const [id,kind,relation]of [['axis','axis','center'],['tangent','plane','tangent'],['center','plane','center']])d=invoke(d,'reference.set',{featureId:'ref-'+id,name:id,kind,references:[{target,geometry:face.referenceGeometry,relation,value:0}]});
 const after=await regenerateExtrusions(d);close(after.volumeMm3,model.volumeMm3);assert.ok(referenceDatums(d).some(d=>d.id==='ref-axis'));
});


test('Native spherical and trimmed cylindrical faces expose verified analytic references',async()=>{
 for(const solid of ['sphere','half-cylinder']){
  let d=upgrade(blank(solid));d=invoke(d,'sketch.create',{sketchId:'s',definitionId:'definition-main',name:'Semicircle',plane:{kind:'datum',role:'xy'},profile:'E1.M5-sketch/1'});
  d=invoke(d,'sketch.entity.add',{sketchId:'s',unit:'mm',entity:{id:'arc',type:'arc',center:[0,0],radius:5,a:[0,-5],b:[0,5],clockwise:false,construction:false}});d=invoke(d,'sketch.entity.add',{sketchId:'s',unit:'mm',entity:{id:'diameter',type:'line',a:[0,5],b:[0,-5],construction:false}});
  d=invoke(d,'extrusion.create',{featureId:'body',sketchId:'s',name:solid,depthMm:10,reverse:false,operation:'new-body',...(solid==='sphere'?{form:'revolve',axisId:'diameter',angleDeg:360}:{})});const r=await regenerateExtrusions(d,{includeMesh:true}),g=r.mesh.faces.find(f=>f.referenceGeometry?.kind===(solid==='sphere'?'sphere':'cylinder'))?.referenceGeometry;assert.ok(g);close(g.radius,5);if(solid==='sphere')close(Math.hypot(...g.origin),0);close(r.volumeMm3,solid==='sphere'?4*Math.PI*125/3:125*Math.PI);
 }
});


test('Axis references respect both direction and line location; coordinate directions reject real conflicts',()=>{
 const axis=constructReference('axis',[entry(plane,'parallel'),entry(line)]);assert.deepEqual(axis.origin,line.origin);assert.deepEqual(axis.normal,[1,0,0]);close(dot(constructReference('axis',[entry(plane,'parallel')]).normal,plane.normal),0);
 assert.throws(()=>constructReference('coordinate',[entry(line),entry({...line,direction:[1,1,0]})]),e=>e.code==='ConstraintConflict');
});
