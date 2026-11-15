import test from 'node:test';
import assert from 'node:assert/strict';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {solveParametric} from '../src/sketch/solver.mjs';
import {parameterRows} from '../src/parameters/query.mjs';
import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';
import {verifyNative} from '../src/native/verify.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {validateRelations} from '../src/sketch/relations.mjs';
import {blank} from '../src/document.mjs';
import {upgrade} from '../src/native/schema.mjs';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {existsSync} from 'node:fs';
import {planeFrame} from '../src/sketch/profile.mjs';
import {dimensionIntent} from '../src/sketch/dimension-intent.mjs';

const ref=(entityId,role='point')=>({entityId,role});
const relation=(id,type,refs,value=null)=>({id,type,refs,driving:true,value});
async function practice(){return command(await extrusionDemo(),'cad.sketch.create.v1',{sketchId:'practice',definitionId:'definition-main',name:'Practice',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});}
const add=(v,entity)=>command(v,'cad.sketch.entity.add.v1',{sketchId:'practice',entity,unit:'mm'});
const constrain=(v,constraint)=>command(v,'cad.sketch.constraint.add.v1',{sketchId:'practice',constraint,allowOverdefined:true});

test('actual delivered0.1.7 strict reader refuses new direction, circle relation and planar frame without changing saved bytes',async t=>{
 await mkdir(resolve('.axiom'),{recursive:true});const dir=await mkdtemp(resolve('.axiom/interactions-old-reader-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const exec=promisify(execFile),git=process.platform==='win32'&&existsSync('C:/Program Files/Git/cmd/git.exe')?'C:/Program Files/Git/cmd/git.exe':'git',archive=await exec(git,['-c','safe.directory='+resolve('.').replaceAll('\\','/'),'archive','--format=tar','e887a1338c4326603e360b435703ca6ab4d8717a','src','platform','package.json','package-lock.json'],{encoding:'buffer',maxBuffer:4*1024*1024}),tar=join(dir,'source.tar');await writeFile(tar,archive.stdout);await exec('tar',['-xf',tar,'-C',dir]);
 let source=await practice();source=add(source,{id:'p',type:'point',point:[5,0],construction:false});source=add(source,{id:'circle',type:'circle',center:[0,0],radius:5,construction:false});const cases=[];
 cases.push(constrain(source,{id:'signed',...dimensionIntent(source.native.graph.features.find(f=>f.id==='practice').data.entities,[ref('p')],'horizontal')}));
 cases.push(constrain(source,relation('on-circle','point-on-circle',[ref('p'),ref('circle','entity')])));
 const face=(await regenerateExtrusions(source)).faces.find(f=>f.role.startsWith('planar:'));cases.push(command(source,'cad.sketch.create.v1',{sketchId:'side',definitionId:'definition-main',name:'Side',profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'extrusion-plate',role:face.role,frame:face.planeFrame}}));
 for(const [i,value]of cases.entries()){const path=join(dir,'case-'+i+'.json');await writeFile(path,JSON.stringify(value));const before=await readFile(path),code=`import {readDocument} from ${JSON.stringify(pathToFileURL(join(dir,'src/document.mjs')).href)};try{await readDocument(${JSON.stringify(path)});process.exitCode=3;}catch(e){console.log(JSON.stringify({refused:true,code:e.code}));}`;const out=await exec(process.execPath,['--input-type=module','-e',code]);assert.match(out.stdout,/"refused":true/);assert.deepEqual(await readFile(path),before);assert.equal((await verifyNative(JSON.parse(before))).valid,true);}
});

test('angled and boolean descendant planar faces support exact frames without pretending to preserve changed geometry',async()=>{
 let v=upgrade(blank('Angled support'));
 const exec=(name,input)=>v=command(v,'cad.'+name+'.v1',input);
 const sketch=(id)=>exec('sketch.create',{sketchId:id,definitionId:'definition-main',name:id,profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
 const polygon=(id,points)=>{sketch(id);for(let i=0;i<points.length;i++)exec('sketch.entity.add',{sketchId:id,entity:{id:id+'-'+i,type:'line',construction:false,a:points[i],b:points[(i+1)%points.length]},unit:'mm'});};
 polygon('triangle',[[0,0],[20,0],[0,20]]);exec('extrusion.create',{featureId:'prism',sketchId:'triangle',name:'Triangular prism',depthMm:10,reverse:false,operation:'new-body'});
 let exact=await regenerateExtrusions(v);const angled=exact.faces.find(f=>f.planeFrame&&Math.abs(f.planeFrame.normal[0])>.1&&Math.abs(f.planeFrame.normal[1])>.1);assert.ok(angled);assert.ok(Math.abs(angled.planeFrame.normal[0]-Math.SQRT1_2)<1e-7);
 exec('sketch.create',{sketchId:'angled',definitionId:'definition-main',name:'Angled side',profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'prism',role:angled.role,frame:angled.planeFrame}});assert.equal((await verifyNative(JSON.parse(JSON.stringify(v)))).valid,true);
 polygon('addition',[[0,0],[10,0],[10,-10],[0,-10]]);exec('extrusion.create',{featureId:'fused',sketchId:'addition',name:'Fused extrusion',depthMm:5,reverse:false,operation:'add',baseFeatureId:'prism'});exact=await regenerateExtrusions(v);assert.ok(Math.abs(exact.volumeMm3-2500)<1e-5);
 const face=exact.faces.find(f=>f.role.startsWith('planar:'));assert.ok(face);exec('sketch.create',{sketchId:'boolean-support',definitionId:'definition-main',name:'Boolean face',profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'fused',role:face.role,frame:face.planeFrame}});assert.equal((await verifyNative(JSON.parse(JSON.stringify(v)))).valid,true);
});

test('circle radius-point Snap persists point-on-circle and follows its fixed target after regeneration',async()=>{
 let v=await practice();v=add(v,{id:'target',type:'point',point:[5,0],construction:false});v=constrain(v,relation('target-fixed','fixed',[ref('target')],[5,0]));
 const after=command(v,'cad.sketch.entity.add.v1',{sketchId:'practice',entity:{id:'circle',type:'circle',center:[0,0],radius:5,construction:false},unit:'mm',snaps:[{fromRole:'center',to:ref('origin:reference-frame')},{fromRole:'circumference',to:ref('target')}]});
 let r=await verifyCommand({before:v,after,normalize:true,requireSolved:true,sketchId:'practice'});v=r.candidate;const data=v.native.graph.features.find(f=>f.id==='practice').data;
 assert.ok(data.constraints.some(c=>c.type==='point-on-circle'));assert.equal((await solveParametric(data)).remainingDOF,0);
 const changed=command(v,'cad.sketch.constraint.update.v1',{sketchId:'practice',constraint:relation('target-fixed','fixed',[ref('target')],[8,0])});r=await verifyCommand({before:v,after:changed,normalize:true,requireSolved:true,sketchId:'practice'});
 assert.ok(Math.abs(r.candidate.native.graph.features.find(f=>f.id==='practice').data.entities.find(e=>e.id==='circle').radius-8)<1e-6);
 const legacy={...data,profile:'E1.M4-sketch/1'};assert.throws(()=>validateRelations(legacy,new Set()),{code:'InvalidInput'},'Older profiles refuse the new relation rather than misread it');
});

test('explicit entity deletion removes associated constraints/bindings and preserves unrelated missing references and immutable versions',async()=>{
 let v=await practice();v=add(v,{id:'a',type:'point',point:[0,0],construction:false});v=add(v,{id:'b',type:'point',point:[0,0],construction:false});
 v=constrain(v,relation('join','coincident',[ref('a'),ref('b')]));v=constrain(v,relation('coordinate','x',[ref('a')],0));v=constrain(v,relation('orphan','coincident',[ref('b'),ref('missing')]));
 v=command(v,'cad.parameter.set.v1',{parameter:{id:'driver',name:'Driver',definitionId:null,unit:'mm',expression:'0 mm'}});
 v=command(v,'cad.parameter.bind.v1',{parameterId:'driver',target:{kind:'dimension',sketchId:'practice',constraintId:'coordinate'},enabled:true});
 const before=structuredClone(v),after=command(v,'cad.sketch.entities.delete.v1',{sketchId:'practice',entityIds:['a']}),sketch=after.native.graph.features.find(f=>f.id==='practice');
 assert.deepEqual(sketch.data.constraints.map(c=>c.id),['orphan']);assert.equal(after.native.graph.parameters.find(p=>p.id==='driver').targets.length,0);
 assert.deepEqual(after.native.versions,before.native.versions);assert.deepEqual(v,before);
 const solved=await solveParametric(sketch.data);assert.equal(solved.status,'LostReference');assert.deepEqual(solved.lost,['orphan']);
 const rows=parameterRows(after,{collection:'constraints'}).filter(r=>r.sketchId==='practice');assert.equal(rows.length,1);assert.equal(rows[0].status,'LostReference');assert.equal(rows[0].id,'orphan');assert.deepEqual(rows[0].participants,[ref('b'),ref('missing')]);
 const repaired=command(after,'cad.sketch.constraint.delete.v1',{sketchId:'practice',constraintId:'orphan'});assert.equal((await solveParametric(repaired.native.graph.features.find(f=>f.id==='practice').data)).valid,true);
});

test('equal redundant driving dimensions remain numerically consistent but expose a repairable ownership conflict',async()=>{
 let v=await practice();v=add(v,{id:'circle',type:'circle',center:[0,0],radius:5,construction:false});v=constrain(v,relation('radius','radius',[ref('circle','entity')],5));v=constrain(v,relation('diameter','diameter',[ref('circle','entity')],10));
 const source=v.native.graph.features.find(f=>f.id==='practice').data,result=await solveParametric(source);
 assert.equal(result.status,'RedundantConsistent');assert.equal(result.valid,false);assert.equal(result.overdefined,true);assert.ok(result.conflicts.includes('radius')&&result.conflicts.includes('diameter'));assert.equal(result.entityStates.circle,'Inconsistent');
 const repaired=structuredClone(source);repaired.constraints.splice(1,1);assert.equal((await solveParametric(repaired)).valid,true);
 const legacy={...source,profile:'E1.M3-sketch/1'};assert.equal((await solveParametric(legacy)).valid,true,'Retained older numerical profile semantics stay reproducible');
});

test('every exact planar side of the native extrusion supports a sketch; forged and changed face witnesses fail without retargeting',async()=>{
 let v=await extrusionDemo();const original=structuredClone(v),shape=await regenerateExtrusions(v),sides=shape.faces.filter(f=>f.role.startsWith('planar:'));
 assert.equal(sides.length,4);assert.ok(shape.faces.some(f=>!f.planeNormal));assert.ok(shape.faces.filter(f=>!f.planeNormal).every(f=>f.resolution==='ResolvedStable'&&f.referenceGeometry?.kind==='cylinder'&&!f.planeFrame),'The exact cylindrical witness is selectable but is not itself a sketch plane');
 for(const face of shape.faces.filter(f=>!f.planeNormal))assert.throws(()=>command(v,'cad.sketch.create.v1',{sketchId:'curved-invalid',definitionId:'definition-main',name:'Curved support',profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'extrusion-plate',role:face.role}}),e=>e.code==='LostReference');
 for(const [i,face]of sides.entries()){
  assert.equal(face.resolution,'ResolvedStable');const frame=face.planeFrame;assert.ok(frame.normal.some(n=>Math.abs(n)>.99));
  const axes=frame.origin.map((n,k)=>Math.abs(frame.normal[k])>.99?n:null).filter(n=>n!==null);assert.ok(axes.some(n=>[0,30,40].some(expected=>Math.abs(n-expected)<1e-7)));
  v=command(v,'cad.sketch.create.v1',{sketchId:'side-'+i,definitionId:'definition-main',name:'Side '+i,profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'extrusion-plate',role:face.role,frame}});
  assert.deepEqual(planeFrame(v.native.graph.features.find(f=>f.id==='side-'+i),v.native.graph),frame);
 }
 assert.equal((await verifyNative(v)).valid,true);assert.deepEqual(v.native.versions,original.native.versions);
 const forged=structuredClone(v),plane=forged.native.graph.features.find(f=>f.id==='side-0').data.plane;plane.frame.origin=plane.frame.origin.map((n,i)=>n+plane.frame.normal[i]);
 await assert.rejects(verifyNative(forged),{code:'LostReference'});
 const changed=command(v,'cad.parameter.set.v1',{parameter:{...v.native.graph.parameters.find(p=>p.id==='stock-width'),expression:'50 mm'}});
 await assert.rejects(verifyCommand({before:v,after:changed,normalize:true,requireSolved:true}),{code:'LostReference'});assert.deepEqual(original.native.versions,v.native.versions);
});

test('Snap creates persistent coincidence in the same geometry command and point drag preserves its exact target',async()=>{
 let v=await practice();v=add(v,{id:'target',type:'point',point:[15,8],construction:false});v=constrain(v,relation('target-fixed','fixed',[ref('target')],[15,8]));
 let next=command(v,'cad.sketch.entity.add.v1',{sketchId:'practice',entity:{id:'chain',type:'line',a:[15,8],b:[25,8],construction:false},unit:'mm',snaps:[{fromRole:'a',to:ref('target')}]});
 let result=await verifyCommand({before:v,after:next,normalize:true,requireSolved:true,sketchId:'practice'});v=result.candidate;
 let source=v.native.graph.features.find(f=>f.id==='practice').data;assert.ok(source.constraints.some(c=>c.type==='coincident'&&c.refs.some(r=>r.entityId==='chain')));
 next=command(v,'cad.sketch.drag.v1',{sketchId:'practice',ref:ref('chain','b'),target:[0,0],snapTarget:ref('origin:reference-frame')});
 result=await verifyCommand({before:v,after:next,normalize:true,requireSolved:true,sketchId:'practice',drag:{ref:ref('chain','b'),target:[0,0]}});
 source=result.candidate.native.graph.features.find(f=>f.id==='practice').data;const line=source.entities.find(e=>e.id==='chain');assert.ok(Math.hypot(...line.b)<1e-6);assert.deepEqual(source.entities.find(e=>e.id==='target').point,[15,8]);assert.deepEqual(line.a,[15,8]);assert.ok(source.entities.some(e=>e.type==='point'&&e.name==='Origin'&&e.construction));
 assert.deepEqual(result.candidate.native.versions,v.native.versions);
 const before=structuredClone(v);assert.throws(()=>command(v,'cad.sketch.entity.add.v1',{sketchId:'practice',entity:{id:'bad',type:'point',point:[0,0],construction:false},unit:'mm',snaps:[{fromRole:'point',to:ref('not-found')}]}),{code:'LostReference'});assert.deepEqual(v,before);
});

test('new signed coordinates are positive in their initial direction; a negative value reverses it without changing old dimensions',async()=>{
 for(const x of [-12,12]){
  let v=await practice();v=add(v,{id:'p',type:'point',point:[x,3],construction:false});let data=v.native.graph.features.find(f=>f.id==='practice').data;
  const c={id:'axis',...dimensionIntent(data.entities,[ref('p')],'horizontal')};assert.equal(c.value,12);assert.equal(c.direction,Math.sign(x));data={...data,constraints:[c]};let r=await solveParametric(data);assert.equal(r.valid,true);assert.ok(Math.abs(r.entities[0].point[0]-x)<1e-6);
  data.constraints[0].value=-7;r=await solveParametric(data);assert.equal(r.valid,true);assert.ok(Math.abs(r.entities[0].point[0]+Math.sign(x)*7)<1e-6);
  const old={...data,constraints:[{id:'old',type:'x',refs:[ref('p')],value:-4,driving:true}]};r=await solveParametric(old);assert.equal(r.valid,true);assert.ok(Math.abs(r.entities[0].point[0]+4)<1e-6);
 }
});

test('directed point-to-line dimensions preserve their chosen side and permit a negative side reversal',async()=>{
 for(const y of [-4,4]){
  let v=await practice();v=add(v,{id:'axis-line',type:'line',a:[0,0],b:[10,0],construction:true});v=add(v,{id:'p',type:'point',point:[5,y],construction:false});
  v=constrain(v,relation('a-fixed','fixed',[ref('axis-line','a')],[0,0]));v=constrain(v,relation('b-fixed','fixed',[ref('axis-line','b')],[10,0]));const source=v.native.graph.features.find(f=>f.id==='practice').data;
  const c={id:'side-distance',...dimensionIntent(source.entities,[ref('p'),ref('axis-line','entity')],'distance')};assert.equal(c.value,4);assert.equal(c.direction,Math.sign(y));let r=await solveParametric({...source,constraints:[...source.constraints,c]});assert.equal(r.valid,true,JSON.stringify(r));assert.ok(Math.abs(r.entities.find(e=>e.id==='p').point[1]-y)<1e-6);
  r=await solveParametric({...source,constraints:[...source.constraints,{...c,value:-6}]});assert.equal(r.valid,true,JSON.stringify(r));assert.ok(Math.abs(r.entities.find(e=>e.id==='p').point[1]+Math.sign(y)*6)<1e-6);
  const fixed={...source,constraints:[...source.constraints,relation('p-fixed','fixed',[ref('p')],[5,y]),{...c,value:-6}]};r=await solveParametric(fixed);assert.equal(r.valid,false);assert.deepEqual(r.entities,fixed.entities,'A failed side reversal retains the original coordinates');
 }
});

test('a compound line-distance remains valid when only its implied parallel equation is redundant',async()=>{
 let v=await practice();for(const [id,y]of [['base',0],['other',4]])v=add(v,{id,type:'line',a:[0,y],b:[10,y],construction:false});
 for(const role of ['a','b'])v=constrain(v,relation('fixed-'+role,'fixed',[ref('base',role)],role==='a'?[0,0]:[10,0]));v=constrain(v,relation('horizontal','horizontal',[ref('other','entity')]));
 const data=v.native.graph.features.find(f=>f.id==='practice').data,c={id:'separation',...dimensionIntent(data.entities,[ref('base','entity'),ref('other','entity')],'distance')};
 const r=await solveParametric({...data,constraints:[...data.constraints,c]});assert.equal(r.valid,true,JSON.stringify(r));assert.equal(r.overdefined,false);assert.ok(!r.conflicts.includes('separation'));assert.equal(r.remainingDOF,2);
 const point={profile:'E1.M5-sketch/1',entities:[{id:'p',type:'point',point:[0,0],construction:false}],constraints:[relation('fixed','fixed',[ref('p')],[0,0]),{id:'coordinate',...dimensionIntent([{id:'p',type:'point',point:[0,0]}],[ref('p')],'horizontal')}]};const redundant=await solveParametric(point);assert.equal(redundant.status,'RedundantConsistent');assert.equal(redundant.valid,false);assert.ok(redundant.conflicts.includes('coordinate')&&redundant.conflicts.includes('fixed'));
});

test('replacing a parameter binding with a numeric dimension is one atomic source update',async()=>{
 const before=await extrusionDemo(),target=before.native.graph.parameters.find(p=>p.id==='stock-width').targets[0],c=before.native.graph.features.find(f=>f.id==='sketch-profile').data.constraints.find(c=>c.id===target.constraintId);assert.ok(c);
 const after=command(before,'cad.sketch.constraint.update.v1',{sketchId:'sketch-profile',constraint:{...c,value:45},unbind:true});assert.equal(after.native.graph.parameters.find(p=>p.id==='stock-width').targets.length,0);assert.equal(after.native.graph.parameters.find(p=>p.id==='stock-width').expression,'40 mm');
 const verified=await verifyCommand({before,after,normalize:true,requireSolved:true,sketchId:'sketch-profile'});assert.ok(Math.abs(verified.after.geometry.volumeMm3-(45*30-9*Math.PI)*10)<1e-5);assert.deepEqual(verified.candidate.native.versions,before.native.versions);
});
