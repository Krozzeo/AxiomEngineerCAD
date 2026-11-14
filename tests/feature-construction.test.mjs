import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,validate} from '../src/document.mjs';
import {upgrade} from '../src/native/schema.mjs';
import {command} from '../src/commands/domain.mjs';
import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';
import {referenceDatums} from '../src/reference/profile.mjs';
import {buildOperationPreview} from '../src/proof/operation-preview.mjs';
import {buildProof} from '../src/proof/kernel.mjs';
import {planeFrame} from '../src/sketch/profile.mjs';

const invoke=(doc,name,input)=>command(doc,'cad.'+name+'.v1',input);
const target=role=>({kind:'datum',producerId:'reference-frame',definitionId:'definition-main',role,occurrencePath:['definition-main']});
const value=n=>({mode:'value',value:n});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,a+' != '+b);
function sketch(doc,id,a=[0,0],b=[10,10],plane={kind:'datum',role:'xy'}){
 doc=invoke(doc,'sketch.create',{sketchId:id,definitionId:'definition-main',name:id,plane,profile:'E1.M5-sketch/1'});
 return invoke(doc,'sketch.entity.add',{sketchId:id,unit:'mm',entity:{id:id+'-rectangle',type:'rectangle',construction:false,a,b}});
}
function extrude(doc,id,sketchId,operation='new-body',extra={}){
 return invoke(doc,'extrusion.create',{featureId:id,sketchId,name:id,operation,depthMm:10,reverse:false,...extra});
}
function base(){return extrude(sketch(upgrade(blank('Construction')),'base-sketch'),'base','base-sketch');}

test('None retains distinct exact solids; Unite, Subtract and Intersect obey material volumes',async()=>{
 const doc=sketch(base(),'second',[5,0],[15,10]);
 for(const [operation,volume,solids]of [['none',2000,2],['add',1500,1],['cut',500,1],['intersect',500,1]]){
  const result=await regenerateExtrusions(extrude(doc,'operation','second',operation,{baseFeatureId:'base'}));
  near(result.volumeMm3,volume);assert.equal(result.validity.solids,solids);
 }
});
test('Extrusion signed limits, symmetric limits and parameter drivers retain analytical volume',async()=>{
 let doc=sketch(upgrade(blank('Limits')),'profile');
 for(const [start,end,expected]of [[value(2),value(7),500],[{mode:'symmetric',value:4},value(0),800],[value(-3),value(5),800]]){
  const result=await regenerateExtrusions(extrude(doc,'operation','profile','new-body',{limits:{start,end}}));near(result.volumeMm3,expected);
 }
 doc=invoke(doc,'parameter.set',{parameter:{id:'length',definitionId:null,name:'Length',unit:'mm',expression:'6 mm',description:''}});
 const result=await regenerateExtrusions(extrude(doc,'operation','profile','new-body',{limits:{start:value(0),end:{...value(6),parameterId:'length'}}}));near(result.volumeMm3,600);
});
test('Reference plane, axis and coordinate system are saved source features usable by sketches and revolutions',async()=>{
 let doc=upgrade(blank('References'));
 doc=invoke(doc,'reference.set',{featureId:'raised',name:'Raised plane',kind:'plane',references:[{target:target('xy'),relation:'offset',value:12}]});
 const datums=referenceDatums(doc);assert.deepEqual(datums[0].originMm,[0,0,12]);
 doc=sketch(doc,'raised-sketch',[0,0],[10,10],{kind:'datum',producerId:'raised',role:'plane'});
 assert.deepEqual(planeFrame(doc.native.graph.features.find(f=>f.id==='raised-sketch'),doc.native.graph).origin,[0,0,12]);
 let result=await regenerateExtrusions(extrude(doc,'raised-solid','raised-sketch'));near(result.bounds[0][2],12);near(result.bounds[1][2],22);
 doc=invoke(doc,'reference.set',{featureId:'new-axis',name:'Reference axis',kind:'axis',references:[{target:target('x'),relation:'coincident',value:0}]});
 assert.deepEqual(referenceDatums(doc).find(d=>d.id==='new-axis').direction,[1,0,0]);
});
test('Selected planar limits and Through All trim the actual extrusion tool',async()=>{
 let doc=sketch(base(),'tool',[2,2],[4,4]);
 const selected={target:target('xy')};
 const clipped=extrude(doc,'cut','tool','cut',{baseFeatureId:'base',limits:{start:value(-2),end:{mode:'offset',value:6,reference:selected}}});
 near((await regenerateExtrusions(clipped)).volumeMm3,976);
 const through=extrude(doc,'cut','tool','cut',{baseFeatureId:'base',limits:{start:value(0),end:{mode:'all',value:0}}});
 near((await regenerateExtrusions(through)).volumeMm3,960);
});

test('Until Next locates the first exact entry or exit rather than using a bounding box',async()=>{
 let doc=base();
 doc=invoke(doc,'reference.set',{featureId:'below',name:'Below',kind:'plane',references:[{target:target('xy'),relation:'offset',value:-5}]});
 doc=sketch(doc,'below-profile',[2,2],[4,4],{kind:'datum',producerId:'below',role:'plane'});
 const result=await regenerateExtrusions(extrude(doc,'entry','below-profile','none',{baseFeatureId:'base',limits:{start:value(0),end:{mode:'next',value:0}}}));
 near(result.volumeMm3,1020);
 const inside=sketch(base(),'inside-profile',[2,2],[4,4]);
 near((await regenerateExtrusions(extrude(inside,'exit','inside-profile','cut',{baseFeatureId:'base',limits:{start:value(0),end:{mode:'next',value:0}}}))).volumeMm3,960);
});

test('Revolve accepts datum axes, angular symmetry and radial selected limits',async()=>{
 const doc=sketch(upgrade(blank('Revolve limits')),'radial',[10,0],[15,5]);
 const axisReference={target:target('y')};
 const make=limits=>extrude(doc,'revolve','radial','new-body',{form:'revolve',axisReference,angleDeg:360,...(limits?{limits}:{})});
 near((await regenerateExtrusions(make())).volumeMm3,2*Math.PI*25*12.5);
 near((await regenerateExtrusions(make({start:{mode:'symmetric',value:45},end:value(0)}))).volumeMm3,Math.PI/2*25*12.5);
 near((await regenerateExtrusions(make({start:value(0),end:{mode:'selected',value:0,reference:{target:target('yz')}}}))).volumeMm3,Math.PI/2*25*12.5);
});

test('Feature transforms preserve multiple source tools and can transform a previous mirror',async()=>{
 let doc=base();
 doc=extrude(doc,'mirror','base-sketch','none',{baseFeatureId:'base',form:'repeat',repeat:{kind:'mirror',sourceFeatureId:'base',axis:'x',offsetMm:20,angleDeg:90,count:2}});
 const mirrored=await regenerateExtrusions(doc,{includeMesh:true});near(mirrored.volumeMm3,2000);assert.equal(mirrored.mesh.bodies.length,2);
 doc=extrude(doc,'array','base-sketch','none',{baseFeatureId:'mirror',form:'repeat',repeat:{kind:'linear',sourceFeatureId:'mirror',axis:'x',offsetMm:20,angleDeg:90,count:3}});
 near((await regenerateExtrusions(doc)).volumeMm3,4000);
});

test('Referenced datums follow parameters and reject incompatible references without a source commit',async()=>{
 let doc=base();
 doc=invoke(doc,'parameter.set',{parameter:{id:'height',definitionId:null,name:'PlaneHeight',unit:'mm',expression:'8 mm',description:''}});
 doc=invoke(doc,'reference.set',{featureId:'driven-plane',kind:'plane',name:'Driven plane',references:[{target:target('xy'),relation:'offset',value:8,parameterId:'height'}]});
 doc=invoke(doc,'parameter.set',{parameter:{id:'height',definitionId:null,name:'PlaneHeight',unit:'mm',expression:'12 mm',description:''}});
 near(referenceDatums(doc).find(d=>d.id==='driven-plane').originMm[2],12);
 const saved=JSON.stringify(doc);
 assert.throws(()=>invoke(doc,'reference.set',{featureId:'bad-plane',kind:'plane',name:'Conflicting plane',references:[{target:target('xy'),relation:'coincident',value:0},{target:target('yz'),relation:'parallel',value:0}]}),{code:'ConstraintConflict'});
 assert.equal(JSON.stringify(doc),saved);
});

test('Legacy Y mirror offsets agree with the explicitly oriented Top reference plane',async()=>{
 const source=base(),repeat={kind:'mirror',sourceFeatureId:'base',axis:'y',offsetMm:2,angleDeg:90,count:2};
 const legacy=extrude(source,'mirror','base-sketch','none',{baseFeatureId:'base',form:'repeat',repeat});
 const referenced=extrude(source,'mirror','base-sketch','none',{baseFeatureId:'base',form:'repeat',repeat:{...repeat,offsetMm:-2,reference:{target:target('xz')}}});
 assert.deepEqual((await regenerateExtrusions(referenced)).bounds,(await regenerateExtrusions(legacy)).bounds);
});


test('Until Selected accepts datum and exact planar face limits in either extrusion direction',async()=>{
 let doc=sketch(base(),'limited',[2,2],[4,4]);
 doc=invoke(doc,'reference.set',{featureId:'above',kind:'plane',name:'Above',references:[{target:target('xy'),relation:'offset',value:20}]});
 const end=reference=>({start:value(0),end:{mode:'selected',value:0,reference}});
 const result=await regenerateExtrusions(extrude(doc,'limited-solid','limited','none',{baseFeatureId:'base',limits:end({target:{...target('plane'),producerId:'above'}})}));near(result.volumeMm3,1080);
 const face=await regenerateExtrusions(extrude(doc,'limited-solid','limited','none',{baseFeatureId:'base',limits:end({target:{kind:'face',producerId:'base',definitionId:'definition-main',role:'top',occurrencePath:['definition-main']}})}));near(face.volumeMm3,1040);
 doc=invoke(doc,'reference.set',{featureId:'below',kind:'plane',name:'Below',references:[{target:target('xy'),relation:'offset',value:-5}]});
 const reverse=await regenerateExtrusions(extrude(doc,'limited-solid','limited','none',{baseFeatureId:'base',reverse:true,limits:end({target:{...target('plane'),producerId:'below'}})}));near(reverse.volumeMm3,1020);
});


test('Reversed numeric, parameter and selected-plane boundaries enclose the same exact material',async()=>{
 let doc=sketch(base(),'range',[2,2],[4,4]);
 const make=limits=>extrude(doc,'range-solid','range','none',{baseFeatureId:'base',limits});
 for(const reverse of [false,true]){
  const bounds={start:value(10),end:value(-10)},normal={start:value(-10),end:value(10)};
  const a=await regenerateExtrusions(invoke(make(bounds),'extrusion.update',{featureId:'range-solid',name:'Range',depthMm:10,reverse}));
  const b=await regenerateExtrusions(invoke(make(normal),'extrusion.update',{featureId:'range-solid',name:'Range',depthMm:10,reverse}));near(a.volumeMm3,1080);assert.deepEqual(a.bounds,b.bounds);
 }
 doc=invoke(doc,'reference.set',{featureId:'range-plane',kind:'plane',name:'Range plane',references:[{target:target('xy'),relation:'offset',value:-5}]});
 const reference={target:{...target('plane'),producerId:'range-plane'}};
 const a=await regenerateExtrusions(make({start:value(10),end:{mode:'selected',value:0,reference}}));
 const b=await regenerateExtrusions(make({start:{mode:'selected',value:0,reference},end:value(10)}));near(a.volumeMm3,1060);assert.deepEqual(a.bounds,b.bounds);
 const offset=await regenerateExtrusions(make({start:value(10),end:{mode:'offset',value:2,reference}}));near(offset.volumeMm3,1052);
 doc=invoke(doc,'parameter.set',{parameter:{id:'negative-end',definitionId:null,name:'NegativeEnd',unit:'mm',expression:'-5 mm',description:''}});
 const driven=await regenerateExtrusions(make({start:value(10),end:{mode:'value',value:999,parameterId:'negative-end'}}));near(driven.volumeMm3,1060);
 const face=role=>({mode:'selected',value:0,reference:{target:{kind:'face',producerId:'base',definitionId:'definition-main',role,occurrencePath:['definition-main']}}});
 near((await regenerateExtrusions(make({start:face('top'),end:face('bottom')}))).volumeMm3,1040);
 doc=invoke(doc,'reference.set',{featureId:'tilted-range',kind:'plane',name:'Tilted range',references:[{target:target('xy'),relation:'angle',value:30}]});
 const plane=referenceDatums(doc).find(d=>d.id==='tilted-range'),z=(plane.normal.reduce((sum,n,i)=>sum+n*plane.originMm[i],0)-3*plane.normal[0]-3*plane.normal[1])/plane.normal[2];
 const tilted={mode:'selected',value:0,reference:{target:{...target('plane'),producerId:'tilted-range'}}};
 near((await regenerateExtrusions(make({start:value(10),end:tilted}))).volumeMm3,1000+4*Math.abs(10-z));

});

test('Preview chooses None only when the requested exact Boolean is unavailable; native commands remain strict',async()=>{
 const doc=sketch(base(),'probe',[2,2],[4,4]),snapshot=JSON.stringify(doc);
 for(const operation of ['add','cut','intersect']){
  const inputs={featureId:'probe-solid',sketchId:'probe',name:'Probe',operation,baseFeatureId:'base',depthMm:10,reverse:false,limits:{start:value(30),end:value(40)}};
  const candidate=invoke(doc,'extrusion.create',inputs),previewOperation={name:'cad.extrusion.create.v1',inputs};
  await assert.rejects(regenerateExtrusions(candidate),{code:'InvalidGeometry'});
  const p=await buildOperationPreview({document:candidate,sourceDocument:doc,previewOperation});near(p.exact.volumeMm3,1040);assert.equal(p.operationState.effectiveOperation,'none');assert.deepEqual(p.operationState.available,{none:true,add:false,cut:false,intersect:false});assert.equal(p.scene.previewLayers[0].kind,'none');
  inputs.limits={start:value(0),end:value(5)};
  const restored=await buildOperationPreview({document:invoke(doc,'extrusion.create',inputs),sourceDocument:doc,previewOperation});assert.equal(restored.operationState.effectiveOperation,operation);assert.equal(restored.operationState.available[operation],true);
 }
 assert.equal(JSON.stringify(doc),snapshot);
});

test('An edited operation exposes the previous model for exact face references, including offset limits',async()=>{
 let doc=extrude(sketch(base(),'edited',[2,2],[4,4]),'edited-solid','edited','none',{baseFeatureId:'base'});
 for(const mode of ['selected','offset']){
  const inputs={featureId:'edited-solid',name:'Edited',depthMm:10,reverse:false,limits:{start:value(0),end:{mode,value:mode==='offset'?2:0,reference:{target:{kind:'face',producerId:'base',definitionId:'definition-main',role:'top',occurrencePath:['definition-main']}}}}};
  const p=await buildOperationPreview({document:invoke(doc,'extrusion.update',inputs),sourceDocument:doc,previewOperation:{name:'cad.extrusion.update.v1',inputs},rollbackAt:'edited-solid'});
  assert.equal(p.scene.models[0].featureId,'base');near(p.exact.volumeMm3,mode==='offset'?1048:1040);near(p.scene.models[0].mesh.volumeMm3,1000);
 }
 const source=await buildProof(doc,{viewportOnly:true,rollbackAt:'edited-solid',beforeOperation:true});assert.equal(source.scene.models[0].featureId,'base');
});


test('The actual Boolean and its remembered editing preference persist independently without relaxing native validation',async()=>{
 const source=sketch(base(),'remember',[2,2],[4,4]),saved=extrude(source,'remember-solid','remember','none',{baseFeatureId:'base',booleanPreference:'cut',limits:{start:value(30),end:value(40)}});
 const restored=JSON.parse(JSON.stringify(saved)),feature=restored.native.graph.features.find(f=>f.id==='remember-solid');assert.equal(feature.data.operation,'none');assert.equal(feature.data.booleanPreference,'cut');near((await regenerateExtrusions(restored)).volumeMm3,1040);
 const explicit=invoke(restored,'extrusion.update',{featureId:'remember-solid',name:'Changed',depthMm:10,reverse:false,operation:'add'});assert.equal(explicit.native.graph.features.find(f=>f.id==='remember-solid').data.booleanPreference,'add');await assert.rejects(regenerateExtrusions(explicit),{code:'InvalidGeometry'});
});

test('Reversed angular limits preserve a valid sweep and its analytical volume',async()=>{
 const doc=sketch(upgrade(blank('Angular limits')),'angular',[10,0],[15,5]);const reference={target:target('y')};
 for(const limits of [{start:value(90),end:value(-90)},{start:value(-90),end:value(90)}]){
  const result=await regenerateExtrusions(extrude(doc,'revolved','angular','new-body',{form:'revolve',axisReference:reference,angleDeg:360,limits}));near(result.volumeMm3,25*12.5*Math.PI);
 }
});


test('Coordinate children include the local principal planes and can be removed independently',()=>{
 let doc=upgrade(blank('Coordinate children'));
 doc=invoke(doc,'reference.set',{featureId:'cs',name:'Local frame',kind:'coordinate',references:[{target:target('origin'),relation:'coincident',value:0}]});
 let datums=referenceDatums(doc);assert.equal(datums.length,7);assert.equal(datums.filter(d=>d.parentId==='cs').length,6);
 assert.deepEqual(datums.find(d=>d.role==='xy').normal,[0,0,1]);assert.deepEqual(datums.find(d=>d.role==='xz').normal,[0,-1,0]);assert.deepEqual(datums.find(d=>d.role==='yz').normal,[1,0,0]);
 doc=invoke(doc,'feature.delete',{featureId:'cs',referenceRole:'x'});datums=referenceDatums(doc);
 assert.equal(datums.some(d=>d.role==='x'),false);assert.equal(datums.length,6);assert.equal(doc.native.graph.features.find(f=>f.id==='cs').data.profile,'E3-reference/2');doc=JSON.parse(JSON.stringify(doc));validate(doc);assert.equal(referenceDatums(doc).length,6);assert.equal(doc.native.graph.features.some(f=>f.id==='cs'),true);
 doc=invoke(doc,'reference.set',{featureId:'cs',replace:true,name:'Renamed frame',kind:'coordinate',references:[{target:target('origin'),relation:'coincident',value:0}]});
 assert.equal(referenceDatums(doc).some(d=>d.role==='x'),false,'Editing the parent must not resurrect a deleted child.');
 doc=invoke(doc,'feature.delete',{featureId:'cs'});assert.equal(referenceDatums(doc).length,0);
});

test('Coordinate child deletion rejects actual dependents without removing siblings',()=>{
 let doc=upgrade(blank('Dependent coordinate plane'));
 doc=invoke(doc,'reference.set',{featureId:'cs',name:'Local frame',kind:'coordinate',references:[{target:target('origin'),relation:'coincident',value:0}]});
 doc=sketch(doc,'on-child',[0,0],[10,10],{kind:'datum',producerId:'cs',role:'xy'});
 const before=structuredClone(doc);
 assert.throws(()=>invoke(doc,'feature.delete',{featureId:'cs',referenceRole:'xy'}),e=>e.code==='LostReference');
 assert.throws(()=>invoke(doc,'feature.delete',{featureId:'cs'}),e=>e.code==='LostReference');assert.deepEqual(doc,before);
 doc=invoke(doc,'feature.delete',{featureId:'cs',referenceRole:'x'});assert.ok(referenceDatums(doc).some(d=>d.role==='xy'));
});

test('Absolute reference presets preserve world axes and planes through exact regeneration',async()=>{
 let doc=upgrade(blank('Absolute planes'));
 for(const [axis,role,normal]of [['x','yz',[1,0,0]],['y','xz',[0,-1,0]],['z','xy',[0,0,1]]]){
  doc=invoke(doc,'reference.set',{featureId:'plane-'+axis,name:'Absolute '+axis,kind:'plane',references:[{target:target(role),relation:'coincident',value:0}]});
  doc=invoke(doc,'reference.set',{featureId:'axis-'+axis,name:'Absolute '+axis,kind:'axis',references:[{target:target(axis),relation:'coincident',value:0}]});
  assert.deepEqual(referenceDatums(doc).find(d=>d.id==='plane-'+axis).normal,normal);
  assert.deepEqual(referenceDatums(doc).find(d=>d.id==='axis-'+axis).direction,['x','y','z'].map(k=>k===axis?1:0));
 }
 doc=sketch(doc,'profile',[0,0],[10,10],{kind:'datum',producerId:'plane-x',role:'plane'});
 near((await regenerateExtrusions(extrude(doc,'solid','profile'))).volumeMm3,1000);
});


test('Reference definition methods are explicit and cannot masquerade as absolute world presets',()=>{
 let doc=upgrade(blank('Definition methods'));
 doc=invoke(doc,'reference.set',{featureId:'absolute',name:'Absolute X',kind:'plane',definitionMode:'x',references:[{target:target('yz'),relation:'coincident',value:0}]});
 const data=doc.native.graph.features.find(f=>f.id==='absolute').data;assert.equal(data.definitionMode,'x');assert.equal(data.profile,'E3-reference/2');
 assert.throws(()=>invoke(doc,'reference.set',{featureId:'invalid',name:'Wrong preset',kind:'plane',definitionMode:'x',references:[{target:target('xy'),relation:'coincident',value:0}]}),e=>e.code==='InvalidInput');
 doc=invoke(doc,'reference.set',{featureId:'by-refs',name:'Front by references',kind:'plane',definitionMode:'references',references:[{target:target('xy'),relation:'coincident',value:0}]});
 assert.equal(doc.native.graph.features.at(-1).data.definitionMode,'references');
});
