import test from 'node:test';
import assert from 'node:assert/strict';
import * as cad from 'replicad';
import {initializeKernel} from '../src/lab/kernel.mjs';
import {analyzeSolids} from '../src/assembly/analysis.mjs';
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
test('exact native intersections distinguish overlap, face contact and positive clearance',async()=>{
 await initializeKernel();const shapes=[cad.makeBox([0,0,0],[10,10,10]),cad.makeBox([5,0,0],[15,10,10]),cad.makeBox([10,0,0],[20,10,10]),cad.makeBox([12,0,0],[22,10,10])];
 try{const item=(shape,i)=>({shape,path:['root','part-'+i],name:'Part '+i});for(const [i,state,volume,distance]of [[1,'Interference',500,0],[2,'Touching',0,0],[3,'BelowClearance',0,2]]){const result=analyzeSolids([item(shapes[0],0),item(shapes[i],i)],{clearanceMm:3});assert.equal(result.pairs[0].state,state);near(result.pairs[0].overlapMm3,volume);near(result.pairs[0].distanceMm,distance);}}
 finally{shapes.forEach(s=>s.delete());}
});
test('repeated positioned solids count mass individually and apply the parallel-axis inertia theorem',async()=>{
 await initializeKernel();const shapes=[cad.makeBox([0,0,0],[10,10,10]),cad.makeBox([20,0,0],[30,10,10])];
 try{const result=analyzeSolids(shapes.map((shape,i)=>({shape,path:['root','part-'+i],name:'Block',material:{name:'Nominal steel',densityKgM3:1000}})));near(result.massKg,.002);near(result.centerOfMassMm[0],15);near(result.centerOfMassMm[1],5);near(result.inertiaKgM2[0][0],2*.001*(.01**2+.01**2)/12,1e-14);near(result.inertiaKgM2[1][1],2*(.001*(.01**2+.01**2)/12+.001*.01**2),1e-14);near(result.inertiaKgM2[0][1],0,1e-14);assert.equal(result.instanceCount,2);assert.equal(result.complete,true);}
 finally{shapes.forEach(s=>s.delete());}
});
test('absent density reports an incomplete aggregate rather than inventing mass or inertia',async()=>{
 await initializeKernel();const shape=cad.makeBox([0,0,0],[10,10,10]);try{const result=analyzeSolids([{shape,path:['root'],name:'Unknown material'}]);assert.equal(result.massKg,null);assert.equal(result.centerOfMassMm,null);assert.equal(result.inertiaKgM2,null);assert.equal(result.complete,false);assert.equal(result.missingMaterials.length,1);near(result.components[0].volumeMm3,1000);assert.throws(()=>analyzeSolids([]),{code:'ResourceLimit'});}finally{shape.delete();}
});
test('a rotated non-cubic solid reports the exact world-axis inertia tensor including products of inertia',async()=>{
 await initializeKernel();const base=cad.makeBox([0,0,0],[10,20,30]),shape=base.rotate(45,[0,0,0],[0,0,1]);try{const result=analyzeSolids([{shape,path:['root'],name:'Rotated block',material:{name:'Nominal',densityKgM3:1000}}]);near(result.massKg,.006,1e-12);near(result.inertiaKgM2[0][0],5.75e-7,1e-14);near(result.inertiaKgM2[1][1],5.75e-7,1e-14);near(result.inertiaKgM2[0][1],7.5e-8,1e-14);near(result.inertiaKgM2[1][0],7.5e-8,1e-14);near(result.centerOfMassMm[0],-5/Math.sqrt(2),1e-10);}finally{shape.delete();base.delete();}
});
