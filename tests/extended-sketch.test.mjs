import {dimensionIntent} from '../src/sketch/dimension-intent.mjs';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {externalGeometry} from '../src/sketch/external-geometry.mjs';
import {buildProof} from '../src/proof/kernel.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {dragComponent} from '../src/sketch/soft-drag.mjs';
import {interpolatedSplines} from '../src/sketch/curves.mjs';
import {extendedSketchDemo} from '../src/sketch/extended-demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {solveParametric} from '../src/sketch/solver.mjs';
import {regenerateExtrusions} from '../src/extrusion/kernel.mjs';

const ref=(entityId,role='entity')=>({entityId,role});
const feature=(doc,id='extended-practice')=>doc.native.graph.features.find(item=>item.id===id);
const run=(doc,name,fields)=>command(doc,'cad.sketch.'+name+'.v1',{sketchId:'extended-practice',...fields});
const relation=(id,type,refs,value=null)=>({id,type,refs,driving:true,value});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' differs from '+b);

test('E3.M1 mixed arcs and lines retain independent DOF and produce an exact curved extrusion',async()=>{
  const doc=extendedSketchDemo(),data=feature(doc,'mixed-profile').data;
  const solved=await solveParametric(data);
  assert.equal(solved.valid,true);
  assert.equal(solved.remainingDOF,5);
  const dragged=await solveParametric(data,{drag:{ref:ref('mixed-arc','a'),target:[-20,2]}});
  assert.equal(dragged.valid,true);
  near(dragged.drag.effectiveTarget[0],-20);
  near(dragged.drag.effectiveTarget[1],2);
  const solid=await regenerateExtrusions(doc);
  near(solid.volumeMm3,Math.PI*16**2/2*8);
  near(solid.centerOfMassMm[1],4*16/(3*Math.PI));
  assert.equal(solid.validity.brepValid,true);
});

test('E3.M1 tangent relations reject contact outside the visible arc sweep',async()=>{
  const doc=extendedSketchDemo(),source=feature(doc,'mixed-profile').data,arc=source.entities[0];
  const fixed=['center','a','b'].map(role=>relation('fix-'+role,'fixed',[ref(arc.id,role)],arc[role]));
  for(const y of [16,-16]){
    const line={id:'tangent-line',type:'line',a:[-20,y],b:[20,y],construction:true};
    const data={...source,entities:[arc,line],constraints:[
      ...fixed,relation('fix-line-a','fixed',[ref(line.id,'a')],line.a),
      relation('fix-line-b','fixed',[ref(line.id,'b')],line.b),
      relation('arc-tangent','tangent',[ref(arc.id),ref(line.id)])
    ]};
    const solved=await solveParametric(data);
    assert.equal(solved.valid,y===16,JSON.stringify(solved.conflicts));
    if(y<0)assert.ok(solved.conflicts.includes('arc-tangent'));
  }
});

test('E3.M1 trim and split preserve retained endpoint identities and remove invalidated dimension drivers',async()=>{
  const doc=extendedSketchDemo();
  const fixed=run(doc,'constraint.add',{constraint:relation('fixed-trim-start','fixed',[ref('practice-trim','a')],[12,32])});
  const trimmed=run(fixed,'trim',{entityId:'practice-trim',newEntityId:'trim-right',fraction:.7});
  const edge=feature(trimmed).data.entities.find(e=>e.id==='practice-trim');
  assert.deepEqual(edge.b,[26,32]);
  assert.deepEqual(feature(trimmed).data.constraints.find(c=>c.id==='fixed-trim-start').refs,[ref('practice-trim','a')]);
  const split=run(trimmed,'split',{entityId:'practice-trim',newEntityId:'split-right',fraction:.5});
  const verified=await verifyCommand({before:trimmed,after:split,normalize:true,requireSolved:true,sketchId:'extended-practice'});
  assert.equal(verified.valid,true);
  assert.deepEqual(feature(verified.candidate).data.entities.find(e=>e.id==='split-right').a,[19,32]);
  const driven=run(doc,'constraint.add',{constraint:relation('trim-length','length',[ref('practice-trim')],28)});
  const cut=run(driven,'trim',{entityId:'practice-trim',newEntityId:'right-cut',fraction:.7});
  assert.equal(feature(cut).data.constraints.some(c=>c.id==='trim-length'),false);
  assert.deepEqual(feature(driven).data.entities.find(e=>e.id==='practice-trim').b,[40,32]);
});

test('E3.M1 regular polygons, associative mirror and bounded patterns solve together',async()=>{
  let doc=extendedSketchDemo();
  doc=run(doc,'mirror',{id:'mirror-one',entityIds:['practice-circle'],axisId:'practice-axis'});
  let data=feature(doc).data,mirror=data.entities.find(e=>e.type==='circle'&&!e.construction&&e.id!=='practice-circle');
  assert.deepEqual(mirror.center,[-14,22]);
  let result=await solveParametric(data);
  assert.equal(result.valid,true);
  result=await solveParametric(data,{drag:{ref:ref('practice-circle','center'),target:[18,24]}});
  assert.equal(result.valid,true);
  const moved=result.entities.find(e=>e.id===mirror.id);
  const axis=result.entities.find(e=>e.id==='practice-axis');
  const source=result.entities.find(e=>e.id==='practice-circle');
  const [dx,dy]=axis.b.map((n,i)=>n-axis.a[i]),mid=source.center.map((n,i)=>(n+moved.center[i])/2-axis.a[i]);
  near(dx*mid[1]-dy*mid[0],0);
  near(dx*(source.center[0]-moved.center[0])+dy*(source.center[1]-moved.center[1]),0);
  doc=run(doc,'pattern',{id:'line-pattern',entityIds:['practice-circle'],count:3,mode:'linear',step:[6,2]});
  doc=run(doc,'pattern',{id:'polar-pattern',entityIds:['practice-circle'],count:3,mode:'circular',center:[0,0],angle:Math.PI/2});
  data=feature(doc).data;
  assert.equal(data.entities.filter(e=>e.type==='circle'&&!e.construction).length,6);
  assert.ok(data.entities.some(e=>e.center&&Math.abs(e.center[0]+22)<1e-7&&Math.abs(e.center[1]-14)<1e-7));
  const guide=data.entities.find(e=>e.type==='circle'&&e.construction);
  const vertices=data.constraints.filter(c=>c.type==='point-on-circle'&&c.refs[1].entityId===guide.id);
  assert.equal(vertices.length,6);
  for(const {refs:[{entityId}]} of vertices){
    const edge=data.entities.find(e=>e.id===entityId);
    near(Math.hypot(edge.a[0]-edge.b[0],edge.a[1]-edge.b[1]),6);
  }
  assert.equal((await solveParametric(data)).valid,true);
});

test('managed pattern follows typed parameters and retains copy identities',()=>{
  const set=(doc,id,unit,expression)=>command(doc,'cad.parameter.set.v1',{parameter:{id,definitionId:null,name:id,unit,expression}});
  let doc=set(extendedSketchDemo(),'RepeatCount','scalar','3');
  doc=set(doc,'RepeatSpacing','mm','5 mm');
  doc=run(doc,'pattern',{id:'driven-pattern',entityIds:['practice-circle'],reference:ref('practice-axis'),
    count:3,spacing:5,mode:'linear',countParameterId:'RepeatCount',spacingParameterId:'RepeatSpacing'});
  const read=source=>{
    const {patterns,entities}=feature(source).data;
    return patterns[0].generated.map(id=>entities.find(e=>e.id===id));
  };
  const initial=read(doc);
  assert.deepEqual(initial.map(e=>e.center),[[14,27],[14,32]]);
  doc=set(doc,'RepeatSpacing','mm','8 mm');
  assert.deepEqual(read(doc).map(e=>e.id),initial.map(e=>e.id));
  assert.deepEqual(read(doc).map(e=>e.center),[[14,30],[14,38]]);
  doc=set(doc,'RepeatCount','scalar','2');
  assert.deepEqual(read(doc).map(e=>e.id),[initial[0].id]);
  assert.throws(()=>command(doc,'cad.parameter.delete.v1',{parameterId:'RepeatSpacing'}),{code:'LostReference'});
});

test('fit spline spans pass through fit points and solve with tangent continuity',async()=>{
 const points=[[-28,12],[-23,16],[-15,12]];
 const entities=interpolatedSplines(points,false).map((entity,i)=>({...entity,id:'spline-'+i}));
 const doc=run(extendedSketchDemo(),'spline.chain',{entities});
 const data=feature(doc).data,solved=await solveParametric(data);
 assert.equal(solved.valid,true);
 assert.equal(data.constraints.some(c=>c.type==='spline-tangent'),true);
 assert.deepEqual(data.entities.find(e=>e.id==='spline-0').b,points[1]);
 assert.deepEqual(data.entities.find(e=>e.id==='spline-1').a,points[1]);
});

test('linear and circular patterns retain implicit datum references and distribute total spacing',async()=>{
 const external=(id,type,role,geometry)=>({id,type,construction:true,referenceOnly:true,
  external:{kind:'datum',definitionId:'definition-main',producerId:'reference-frame',role,occurrencePath:['definition-main']},...geometry});
 const axis=external('test-axis','line','x',{a:[-100,0],b:[100,0]});
 const center=external('test-center','point','origin',{point:[0,0]});
 let doc=run(extendedSketchDemo(),'pattern',{id:'linear-total',entityIds:['practice-circle'],reference:ref(axis.id),
  externalEntities:[axis],count:14,spacing:52,distribution:'total',mode:'linear'});
 let data=feature(doc).data;
 assert.equal(data.patterns[0].generated.length,13);
 assert.deepEqual(data.entities.find(e=>e.id===data.patterns[0].generated.at(-1)).center,[66,22]);
 doc=run(doc,'pattern',{id:'full-circle',entityIds:['practice-circle'],reference:ref(center.id,'point'),
  externalEntities:[center],count:4,spacing:Math.PI*2,distribution:'total',mode:'circular'});
 data=feature(doc).data;
 const final=data.entities.find(e=>e.id===data.patterns[1].generated.at(-1));
 near(final.center[0],22);near(final.center[1],-14);
 assert.equal((await verifyCommand({before:extendedSketchDemo(),after:doc,normalize:true,requireSolved:true,sketchId:'extended-practice'})).valid,true);
});


test('placing a polygon center on a remote fixed point preserves all six equal sides',async()=>{
 const doc=run(extendedSketchDemo(),'polygon',{id:'center-test',center:[-60,-40],vertex:[-54,-40],sides:6,construction:false});
 const target=run(doc,'entity.add',{entity:{id:'target-center',type:'point',point:[-25,-35],construction:false},unit:'mm'});
 const fixed=run(target,'constraint.add',{constraint:relation('fix-target-center','fixed',[ref('target-center','point')],[-25,-35])});
 const before=feature(fixed).data,guide=before.entities.filter(e=>e.type==='circle'&&e.construction).at(-1);
 const input=run(fixed,'constraint.add',{constraint:relation('join-center','coincident',[ref(guide.id,'center'),ref('target-center','point')])});
 const data=feature(input).data,solved=await solveParametric(data);
 assert.equal(solved.valid,true,JSON.stringify({status:solved.status,conflicts:solved.conflicts}));
 assert.deepEqual(solved.entities.find(e=>e.id===guide.id).center,[-25,-35]);
 assert.equal(data.constraints.filter(c=>c.type==='equal'&&c.refs[0].entityId==='center-test').length,5);
});

test('equation curves recalculate from scoped parameters and survive a solver round trip',async()=>{
 const set=(doc,expression)=>command(doc,'cad.parameter.set.v1',{parameter:{id:'CurveGain',definitionId:null,name:'CurveGain',unit:'scalar',expression}});
 let doc=set(extendedSketchDemo(),'2');
 doc=run(doc,'equation-curve.add',{id:'equation-x',construction:true,recipe:{mode:'x',start:'0',end:'4',first:'CurveGain * x'}});
 const read=value=>feature(value).data.entities.find(e=>e.id==='equation-x');
 assert.deepEqual(read(doc).samples.at(-1),[4,8]);
 const changed=set(doc,'3');
 assert.deepEqual(read(changed).samples.at(-1),[4,12]);
 const checked=await verifyCommand({before:doc,after:changed,normalize:true,requireSolved:true});
 assert.deepEqual(read(checked.candidate).samples.at(-1),[4,12]);
});


test('a drag across six independent polygons solves only the connected seven entities first',async t=>{
 let doc=extendedSketchDemo();
 for(let i=0;i<6;i++)doc=run(doc,'polygon',{id:'stress-'+i,center:[10*i-80,-55],vertex:[10*i-77,-55],sides:6,construction:false});
 const data=feature(doc).data,target=ref('stress-0','a'),component=dragComponent(data,target);
 assert.equal(component.entities.length,7);
 const start=performance.now(),solved=await solveParametric(component,{drag:{ref:target,target:[-76,-54]}});
 t.diagnostic('Connected drag solve: '+(performance.now()-start).toFixed(1)+' ms from a '+data.entities.length+'-entity sketch.');
 assert.equal(solved.valid,true);
 near(solved.drag.effectiveTarget[0],-76);
 near(solved.drag.effectiveTarget[1],-54);
});

test('an upstream sketch line is independently resolved and verified for a downstream dimension',async()=>{
 const base=extendedSketchDemo();
 const downstream=command(base,'cad.sketch.create.v1',{sketchId:'linked-sketch',definitionId:'definition-main',name:'Linked sketch',plane:{kind:'datum',role:'xy'},profile:'E1.M5-sketch/1'});
 const local=command(downstream,'cad.sketch.entity.add.v1',{sketchId:'linked-sketch',entity:{id:'linked-point',type:'point',point:[14,35],construction:false},unit:'mm'});
 const external={id:'linked-line',type:'line',a:[12,32],b:[40,32],construction:true,referenceOnly:true,
  external:{kind:'sketch',definitionId:'definition-main',producerId:'extended-practice',role:'practice-trim',occurrencePath:['definition-main']}};
 const after=command(local,'cad.sketch.constraint.add.v1',{sketchId:'linked-sketch',
  constraint:relation('linked-distance','distance',[ref('linked-point','point'),ref('linked-line')],3),externalEntities:[external]});
 assert.ok(feature(after,'linked-sketch').dependsOn.includes('extended-practice'));
 assert.equal((await verifyCommand({before:local,after,normalize:true,requireSolved:true,sketchId:'linked-sketch'})).valid,true);
});


test('a trim stroke removes isolated crossed spans and their invalidated relations atomically',()=>{
 const add=(doc,id,a,b)=>run(doc,'entity.add',{entity:{id,type:'line',a,b,construction:false},unit:'mm'});
 let doc=add(extendedSketchDemo(),'isolated-a',[-62,-45],[-50,-45]);
 doc=add(doc,'isolated-b',[-62,-41],[-50,-41]);
 doc=run(doc,'constraint.add',{constraint:relation('isolated-length','length',[ref('isolated-a')],12)});
 const after=run(doc,'trim',{newEntityId:'trim-stroke',stroke:[[-55,-47],[-55,-39]]});
 const data=feature(after).data;
 assert.ok(!data.entities.some(e=>e.id.startsWith('isolated-')));
 assert.ok(!data.constraints.some(c=>c.id==='isolated-length'));
 assert.ok(feature(doc).data.entities.some(e=>e.id==='isolated-a'));
});

test('side-on cylinder yields two independently proven silhouette segments and endpoints',async()=>{
 const doc=await extrusionDemo(),proof=await buildProof(doc,{viewportOnly:true}),model=proof.scene.models[0];
 const cylinder=model.mesh.cylinders.find(c=>Math.abs(c.radius-3)<1e-7);
 assert.ok(cylinder);
 const frame={origin:[0,0,0],u:[1,0,0],v:[0,0,1],normal:[0,-1,0]};
 const lines=[':a',':b'].map(side=>externalGeometry(proof.scene,{kind:'silhouette',role:cylinder.role+side,
  definitionId:model.definitionId,producerId:model.featureId,occurrencePath:[model.definitionId]},frame));
 for(const line of lines){near(line.a[0],line.b[0]);near(Math.abs(line.b[1]-line.a[1]),10);}
 near(Math.abs(lines[0].a[0]-lines[1].a[0]),6);
});


test('a spline handle is an editable line reference for a driving dimension and relation',async()=>{
 let doc=run(extendedSketchDemo(),'entity.add',{entity:{id:'handle-test',type:'spline',construction:false,a:[-30,-20],b:[-15,-20],control1:[-26,-17],control2:[-18,-20]},unit:'mm'});
 const handle=ref('handle-test','handle-a'),intent=dimensionIntent(feature(doc).data.entities,[handle],'distance');
 near(intent.value,5);
 doc=run(doc,'constraint.add',{constraint:{...intent,id:'handle-length',value:8}});
 doc=run(doc,'constraint.add',{constraint:relation('handle-horizontal','horizontal',[handle])});
 const solved=await solveParametric(feature(doc).data);
 assert.equal(solved.valid,true,solved.status);
 const spline=solved.entities.find(e=>e.id==='handle-test');
 near(spline.a[1],spline.control1[1]);
 near(Math.abs(spline.a[0]-spline.control1[0]),8);
});
