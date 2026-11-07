import test from 'node:test';
import assert from 'node:assert/strict';
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

test('E3.M1 trim and split preserve retained endpoint identities and refuse lost dimension drivers',async()=>{
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
  assert.throws(()=>run(driven,'trim',{entityId:'practice-trim',newEntityId:'no-trim',fraction:.7}),{code:'ConstraintConflict'});
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
