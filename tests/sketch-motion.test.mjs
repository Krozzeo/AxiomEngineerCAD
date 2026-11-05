import {dragSnapExclusions} from '../app/sketch-snap.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {solveParametric} from '../src/sketch/solver.mjs';

test('every representation of every free rectangle corner reaches a two-axis pointer goal',async()=>{
 let doc=command(await extrusionDemo(),'cad.sketch.create.v1',{sketchId:'motion',definitionId:'definition-main',name:'Motion',profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
 doc=command(doc,'cad.sketch.entity.add.v1',{sketchId:'motion',entity:{id:'rect',type:'rectangle',a:[10,10],b:[30,25],construction:false},unit:'mm'});
 const data=doc.native.graph.features.find(f=>f.id==='motion').data;
 for(const entity of data.entities)for(const role of ['a','b']){
  const target=entity[role].map((v,i)=>v+(i?4:3)),result=await solveParametric(data,{drag:{ref:{entityId:entity.id,role},target}});
  assert.equal(result.valid,true);const actual=result.entities.find(e=>e.id===entity.id)[role];
  assert.ok(Math.hypot(...actual.map((v,i)=>v-target[i]))<1e-5,JSON.stringify({entity:entity.id,role,target,actual}));
 }
});

test('isolated endpoint drag retains its opposite endpoint without inventing a geometric constraint',async()=>{
 const data={profile:'E1.M5-sketch/1',entities:[{id:'line',type:'line',a:[0,0],b:[10,0],construction:false}],constraints:[]};
 const result=await solveParametric(data,{drag:{ref:{entityId:'line',role:'a'},target:[3,4]}});
 assert.equal(result.valid,true);assert.deepEqual(result.entities[0].b,[10,0]);assert.ok(Math.hypot(result.entities[0].a[0]-3,result.entities[0].a[1]-4)<1e-6);assert.equal(data.constraints.length,0);
});

test('a genuinely fixed coordinate remains fixed while an accessible pointer direction moves',async()=>{
 const data={profile:'E1.M5-sketch/1',entities:[{id:'line',type:'line',a:[0,0],b:[10,0],construction:false}],constraints:[{id:'hold',type:'fixed',refs:[{entityId:'line',role:'a'}],driving:true,value:[0,0]},{id:'horizontal',type:'horizontal',refs:[{entityId:'line',role:'entity'}],driving:true,value:null}]};
 const result=await solveParametric(data,{drag:{ref:{entityId:'line',role:'b'},target:[15,6]}});
 assert.equal(result.valid,true);assert.ok(Math.abs(result.entities[0].b[0]-15)<1e-6);assert.ok(Math.abs(result.entities[0].b[1])<1e-6);
});

test('drag snapping excludes coincident aliases and moving geometry, not unrelated overlapping points',()=>{
 const entities=[{id:'a',type:'line',a:[0,0],b:[10,0]},{id:'b',type:'line',a:[0,0],b:[0,10]},{id:'unrelated',type:'point',point:[0,0]}],constraints=[{type:'coincident',driving:true,refs:[{entityId:'a',role:'a'},{entityId:'b',role:'a'}]}],preview=structuredClone(entities);preview[0].a=[2,1];preview[1].a=[2,1];
 const excluded=dragSnapExclusions(entities,constraints,{entityId:'a',role:'a'},preview);assert.ok(excluded.has('b:a'));assert.ok(excluded.has('b:midpoint'));assert.equal(excluded.has('b:b'),false);assert.equal(excluded.has('unrelated:point'),false);
});
