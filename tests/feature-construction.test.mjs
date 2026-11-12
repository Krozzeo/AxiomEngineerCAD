import test from 'node:test';
import assert from 'node:assert/strict';
import {blank} from '../src/document.mjs';
import {upgrade} from '../src/native/schema.mjs';
import {command} from '../src/commands/domain.mjs';
import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';
import {referenceDatums} from '../src/reference/profile.mjs';
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
