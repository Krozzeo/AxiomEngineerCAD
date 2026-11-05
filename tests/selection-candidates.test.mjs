import test from 'node:test';
import assert from 'node:assert/strict';
import {modelCandidates} from '../app/model-candidates.mjs';
import {cameraMatrix,normalView,project} from '../app/cad-camera.mjs';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {buildProof} from '../src/proof/kernel.mjs';

test('ordinary circle-center picking respects an opaque exact solid; the overlap table retains hidden choices',async()=>{
 globalThis.window={};
 const renderer=scene=>{
  let id=1;for(const o of scene.occurrences){const mesh=scene.models.find(m=>m.definitionId===o.definitionId).mesh;for(const [field,collection]of [['vertexSelectionIds',mesh.exactVertices],['edgeSelectionIds',mesh.edges],['faceSelectionIds',mesh.faces]])o[field]=Object.fromEntries(collection.map(e=>[e.role,id++]));o.bodySelectionId=id++;o.featureSelectionId=id++;o.instanceSelectionId=id++;}
  const camera={...normalView([0,0,1]),center:[20,15,10],span:100,aspect:1,pan:[0,0]},matrix=cameraMatrix(camera);
  return {scene,filter:'auto',canvas:{getBoundingClientRect:()=>({width:1000})},presentedFrame:{scene,camera,matrix,width:1000,height:1000,projection:'orthographic'},referenceCandidates:()=>[],kind:()=>null};
 };
 let doc=await extrusionDemo();const base=renderer((await buildProof(doc,{viewportOnly:true})).scene);assert.ok(modelCandidates(base,500,500,{specialOnly:true}).some(c=>c.componentRole==='center'));
 doc=command(doc,'cad.sketch.create.v1',{sketchId:'cap-profile',definitionId:'definition-main',name:'Opaque cap',profile:'E1.M5-sketch/1',plane:{kind:'face',producerId:'extrusion-plate',role:'top'}});
 doc=command(doc,'cad.sketch.entity.add.v1',{sketchId:'cap-profile',entity:{id:'cap-outline',type:'rectangle',a:[17,12],b:[23,18],construction:false},unit:'mm'});
 doc=command(doc,'cad.extrusion.create.v1',{featureId:'cap',sketchId:'cap-profile',name:'Cap',depthMm:5,reverse:false,operation:'add',baseFeatureId:'extrusion-plate'});
 const occluded=renderer((await buildProof(doc,{viewportOnly:true})).scene);assert.equal(modelCandidates(occluded,500,500,{specialOnly:true}).some(c=>c.componentRole==='center'),false);assert.ok(modelCandidates(occluded,500,500,{all:true}).some(c=>c.componentRole==='center'));
 delete globalThis.window;
});

test('cylindrical divisions remain semantic witnesses but are never Model overlap choices',async()=>{
 globalThis.window={};
 try{
  const scene=(await buildProof(await extrusionDemo(),{viewportOnly:true})).scene,o=scene.occurrences[0],mesh=scene.models[0].mesh,hidden=mesh.edges.filter(e=>e.displayHidden);
  assert.equal(hidden.length,2);o.edgeSelectionIds=Object.fromEntries(mesh.edges.map((e,i)=>[e.role,i+1]));o.faceSelectionIds={};o.vertexSelectionIds={};
  const camera={...normalView([0,-1,0]),center:[20,15,5],span:60,aspect:1,pan:[0,0]},matrix=cameraMatrix(camera),renderer={scene,filter:'edge',canvas:{getBoundingClientRect:()=>({width:1000})},presentedFrame:{scene,camera,matrix,width:1000,height:1000,projection:'orthographic'},referenceCandidates:()=>[],kind:()=>null};
  for(const seam of hidden){const middle=seam.points[0].map((n,i)=>(n+seam.points.at(-1)[i])/2),[x,y]=project(middle,matrix,1000,1000);assert.ok(!modelCandidates(renderer,x,y,{all:true}).some(c=>c.selectionId===o.edgeSelectionIds[seam.role]));}
  assert.ok(mesh.edges.some(e=>e.curve?.full&&!e.displayHidden));
 }finally{delete globalThis.window;}
});
