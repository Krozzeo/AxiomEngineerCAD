import test from 'node:test';import assert from 'node:assert/strict';
import {blank} from '../src/document.mjs';import {upgrade} from '../src/native/schema.mjs';import {command} from '../src/commands/domain.mjs';import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';import {executionContent} from '../src/commands/execution.mjs';
const edit=(d,n,i)=>command(d,'cad.'+n+'.v1',i),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,a+' != '+b);
function base(){let d=upgrade(blank('Finishing'));d=edit(d,'sketch.create',{sketchId:'s',definitionId:'definition-main',name:'Square',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});d=edit(d,'sketch.entity.add',{sketchId:'s',unit:'mm',entity:{id:'r',type:'rectangle',a:[0,0],b:[10,10],construction:false}});return edit(d,'extrusion.create',{featureId:'base',sketchId:'s',name:'Cube',depthMm:10,reverse:false,operation:'new-body'});}
async function finish(d,kind,radiusMm=1){const result=await regenerateExtrusions(d,{includeMesh:true}),edge=result.mesh.edges.find(e=>!e.displayHidden&&!e.curve&&e.points.every(p=>Math.abs(p[2]-10)<1e-6));assert.ok(edge);return edit(d,'extrusion.create',{featureId:'finish',sketchId:'s',name:kind,depthMm:10,reverse:false,operation:'none',baseFeatureId:'base',form:'finish',finishing:{kind,radiusMm,references:[{target:{kind:'edge',definitionId:'definition-main',producerId:'base',role:edge.role,occurrencePath:['definition-main']}}]}});}
test('Exact bounded single-edge chamfer and fillet obey independent prism volume oracles',async()=>{
 for(const [kind,expected]of [['chamfer',995],['fillet',1000-10*(1-Math.PI/4)]]){const doc=await finish(base(),kind),result=await regenerateExtrusions(doc,{includeMesh:true,includeToolMesh:true});near(result.volumeMm3,expected);assert.equal(result.validity.solids,1);assert.ok(result.finishingLayers.some(l=>l.kind==='subtract'));assert.equal(doc.native.graph.features.at(-1).data.profile,'E3-finishing/1');}
});
test('Invalid finishing and dependency order preserve the source; suppression restores the preceding material',async()=>{
 const source=base(),before=structuredClone(source),bad=await finish(source,'fillet',100);await assert.rejects(()=>regenerateExtrusions(bad),e=>e.code==='InvalidGeometry');assert.deepEqual(source,before);
 const good=await finish(source,'chamfer');assert.throws(()=>edit(good,'feature.reorder',{featureId:'finish',direction:'earlier'}),e=>e.code==='DependencyOrder');assert.throws(()=>edit(good,'feature.delete',{featureId:'base'}),e=>e.code==='LostReference');
 const suppressed=edit(good,'feature.enable',{featureId:'finish',enabled:false});near((await regenerateExtrusions(executionContent(suppressed))).volumeMm3,1000);near((await regenerateExtrusions(edit(suppressed,'feature.enable',{featureId:'finish',enabled:true}))).volumeMm3,995);
});
test('Explicit pattern Boolean and total distribution use the same material policy as extrude',async()=>{
 const d=base();for(const [operation,expected]of [['none',3000],['add',2000],['cut',500],['intersect',500]]){
  const doc=edit(d,'extrusion.create',{featureId:'pattern',sketchId:'s',name:'Linear',depthMm:10,reverse:false,operation,baseFeatureId:'base',form:'repeat',repeat:{kind:'linear',axis:'x',sourceFeatureId:'base',count:3,offsetMm:10,angleDeg:90,distribution:'total',reverse:false,explicitBoolean:true}});
  const r=await regenerateExtrusions(doc);near(r.volumeMm3,expected);
 }
});


test('Full circular ranges omit duplicate end instances and reverse partial ranges consistently',async()=>{
 for(const [range,count,reverse,expected]of [[360,4,false,[0,0]],[-360,4,false,[0,0]],[180,3,false,[-5/3,5/3]],[180,3,true,[5/3,-5/3]]]){
  const doc=edit(base(),'extrusion.create',{featureId:'ring',sketchId:'s',name:'Circular range',depthMm:10,reverse:false,operation:'none',baseFeatureId:'base',form:'repeat',repeat:{kind:'circular',axis:'z',sourceFeatureId:'base',count,offsetMm:0,angleDeg:range,distribution:'total',reverse,explicitBoolean:true}}),r=await regenerateExtrusions(doc,{includeMesh:true});near(r.volumeMm3,count*1000);near(r.centerOfMassMm[0],expected[0]);near(r.centerOfMassMm[1],expected[1]);assert.equal(new Set(r.mesh.bodies.map(b=>b.role)).size,count);
 }
});
test('Mirror Feature supports each explicit Boolean against overlapping material',async()=>{
 for(const [operation,volume]of [['none',2000],['add',1500],['cut',500],['intersect',500]]){
  const d=edit(base(),'extrusion.create',{featureId:'mirror',sketchId:'s',name:'Mirror',depthMm:10,reverse:false,operation,baseFeatureId:'base',form:'repeat',repeat:{kind:'mirror',axis:'x',sourceFeatureId:'base',count:2,offsetMm:2.5,angleDeg:90,explicitBoolean:true}});near((await regenerateExtrusions(d)).volumeMm3,volume);
 }
});
test('The M3 bracket has independent material/body oracles and can reorder an independent sketch safely',async()=>{
 const {finishingDemo}=await import('../src/extrusion/finishing-demo.mjs');const d=await finishingDemo(),before=JSON.stringify(d),r=await regenerateExtrusions(d,{includeMesh:true});near(r.volumeMm3,16266+291*Math.PI);assert.equal(r.validity.solids,3);
 const moved=edit(d,'feature.reorder',{featureId:'reference-practice',direction:'earlier'});near((await regenerateExtrusions(moved)).volumeMm3,r.volumeMm3);assert.equal(JSON.stringify(d),before);assert.equal(moved.native.graph.features.at(-1).id,'separate-cone');
});


test('Suppressed reference families retain source rows and cannot silently enable themselves during edit',async()=>{
 const {workbenchItems}=await import('../src/workbench/model.mjs');let d=base();const target=role=>({kind:'datum',producerId:'reference-frame',definitionId:'definition-main',occurrencePath:['definition-main'],role});
 d=edit(d,'reference.set',{featureId:'plane',kind:'plane',name:'Plane',references:[{target:target('xy'),relation:'offset',value:15}]});d=edit(d,'reference.set',{featureId:'cs',kind:'coordinate',name:'Frame',references:[{target:{...target('xy'),producerId:'plane',role:'plane'},relation:'coincident',value:0}]});
 d=edit(d,'feature.enable',{featureId:'plane',enabled:false});const items=workbenchItems(d);assert.equal(items.find(i=>i.id==='plane').disabled,true);assert.equal(items.find(i=>i.id==='cs').disabled,true);assert.equal(items.filter(i=>i.parentId==='cs').length,6);
 d=edit(d,'reference.set',{featureId:'plane',replace:true,kind:'plane',name:'Edited plane',references:[{target:target('xy'),relation:'offset',value:20}]});assert.equal(d.native.graph.features.find(f=>f.id==='plane').disabled,true);
 d=edit(d,'feature.enable',{featureId:'plane',enabled:true});assert.equal(workbenchItems(d).find(i=>i.id==='cs').disabled,false);near((await regenerateExtrusions(d)).volumeMm3,1000);
});
