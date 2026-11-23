import {validateSpatial} from '../src/assembly/native-profile.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Document} from '../src/document.mjs';
import {NativeSession} from '../src/native/session.mjs';
import {WorkingHistory} from '../src/commands/history.mjs';
import {workspaceVersionDemo} from '../src/workspace/demo.mjs';
import {prepareNativeAssembly} from '../src/assembly/native.mjs';
import {projectMotion,relations,solveAssembly} from '../src/assembly/solver.mjs';
import {MotionSession} from '../src/workspace/motion-session.mjs';

test('pointer projection keeps permanent constraints without per-frame rank computation',()=>{
 const datum={id:'plane',kind:'plane',origin:[0,0,0],direction:[0,0,1],state:'ResolvedStable'},body=(id,grounded)=>({id,definitionId:id,grounded,pose:{position:[0,0,0],quaternion:[0,0,0,1]},datums:[datum]});
 let r={profile:'E4.M4-spatial/1',unit:'mm',bodies:[body('base',true),body('pin',false)],mates:[{id:'support',type:'coincident',a:{bodyId:'base',datumId:'plane'},b:{bodyId:'pin',datumId:'plane'}}]};
 for(let i=1;i<=12;i++){const result=projectMotion(r,[{bodyId:'pin',position:[i,2*i,8],quaternion:[0,0,0,1]}]);assert.equal(result.applicable,true);r=result.solvedRecipe;assert.ok(Math.abs(r.bodies[1].pose.position[2])<1e-6);assert.ok(Math.abs(r.bodies[1].pose.position[0]-i)<1e-6);assert.ok(relations(r.bodies,r.mates).rows.every(x=>Math.abs(x.value)<1e-6));assert.equal(result.rank,undefined);}
 assert.throws(()=>projectMotion(r,[{bodyId:'pin',position:[Infinity,0,0],quaternion:[0,0,0,1]}]),/bounded/);
});

test('many staged moves keep one native revision and one Undo entry; stale sequences and failed validation preserve MAIN',async()=>{
 const demo=await workspaceVersionDemo(),value=demo.documents[2][1],prepared=await prepareNativeAssembly(value),model={recipe:prepared.recipe,paths:prepared.bodies.map(n=>n.path),sourcePoses:prepared.bodies.map(n=>n.placement)};
 const doc=new Document('motion-unit.engineer.json',value);doc.native=new NativeSession(doc,'.');doc.commands={history:new WorkingHistory()};const session=new MotionSession(doc,model),pin=model.paths.findIndex(p=>p.at(-1)==='pin-1'),initial=structuredClone(doc.value);
 for(let i=0;i<4;i++){const result=session.stage({expectedDocumentRevision:initial.revision,sequence:i,targets:[{path:model.paths[pin],pose:{position:[30+i,10,6],quaternion:[0,0,0,1]}}]});assert.equal(result.sequence,i+1);assert.deepEqual(doc.value,initial);assert.equal(doc.status().dirty,true);}
 assert.throws(()=>session.stage({expectedDocumentRevision:initial.revision,sequence:0,targets:[]}),/sequence/);
 assert.throws(()=>doc.native.editGraph({expectedRevision:initial.revision,graph:initial.native.graph}),/motion session/);
 await assert.rejects(session.commit({expectedDocumentRevision:initial.revision,sequence:4},async()=>{throw Error('verification rejected');}),/verification rejected/);assert.deepEqual(doc.value,initial);
 await session.commit({expectedDocumentRevision:initial.revision,sequence:4},async()=>{});assert.equal(doc.value.revision,initial.revision+1);assert.equal(doc.commands.history.state(doc.value).undoCount,1);assert.equal(doc.stagedMotion,null);assert.deepEqual(doc.commands.history.target(doc.value,'undo').native.graph,initial.native.graph);
});

test('reverse distance chooses the other side without changing legacy mate interpretation',()=>{
 const plane={id:'p',kind:'plane',origin:[0,0,0],direction:[0,0,1],state:'ResolvedStable'},body=(id,g)=>({id,definitionId:id,grounded:g,pose:{position:[0,0,0],quaternion:[0,0,0,1]},datums:[plane]});
 for(const flipped of [false,true]){const r={profile:'E4.M4-spatial/1',unit:'mm',bodies:[body('a',true),body('b',false)],mates:[{id:'distance',type:'distance',a:{bodyId:'a',datumId:'p'},b:{bodyId:'b',datumId:'p'},value:5,flipped}]};const result=solveAssembly(r);assert.equal(result.applicable,true);assert.ok(Math.abs(result.poses[1].position[2]-(flipped?-5:5))<1e-6);}
});

test('reversed parallel and angle relations solve the requested orientation branch',()=>{
 const d={id:'axis',kind:'axis',origin:[0,0,0],direction:[0,0,1],state:'ResolvedStable'},body=(id,g)=>({id,definitionId:id,grounded:g,pose:{position:[0,0,0],quaternion:[0,0,0,1]},datums:[d]});
 for(const type of ['parallel','angle']){const r={profile:'E4.M4-spatial/1',unit:'mm',bodies:[body('a',true),body('b',false)],mates:[{id:'reverse',type,a:{bodyId:'a',datumId:'axis'},b:{bodyId:'b',datumId:'axis'},flipped:true,...(type==='angle'?{value:Math.PI/6}:{})}]};const result=solveAssembly(r);assert.equal(result.applicable,true);assert.ok(result.evidence.maxAngularResidualRad<1e-7);const q=result.poses[1].quaternion,z=1-2*(q[0]*q[0]+q[1]*q[1]);assert.ok(Math.abs(z-(type==='parallel'?-1:Math.cos(5*Math.PI/6)))<1e-7);}
});

test('a grounded bridge does not wake unrelated movable components; coupled components follow the dragged body',()=>{
 const datum={id:'frame',kind:'frame',origin:[0,0,0],state:'ResolvedStable'},body=(id,x,g=false)=>({id,definitionId:id,grounded:g,pose:{position:[x,0,0],quaternion:[0,0,0,1]},datums:[datum]});const r={profile:'E4.M4-spatial/1',unit:'mm',bodies:[body('base',0,true),body('a',0),body('b',10),body('unrelated',100)],mates:[{id:'pair',type:'fixed',a:{bodyId:'a',datumId:'frame'},b:{bodyId:'b',datumId:'frame'},relative:{position:[10,0,0],quaternion:[0,0,0,1]}}]};const result=projectMotion(r,[{bodyId:'a',position:[20,5,0],quaternion:[0,0,0,1]}]);assert.equal(result.applicable,true);assert.ok(Math.abs(result.solvedRecipe.bodies[1].pose.position[0]-20)<.001);assert.ok(Math.abs(result.solvedRecipe.bodies[2].pose.position[0]-30)<.001);assert.deepEqual(result.solvedRecipe.bodies[3],r.bodies[3]);assert.deepEqual(result.solvedRecipe.bodies.map(b=>b.grounded),[true,false,false,false]);
});

test('native M4 direction is versioned explicitly and legacy M3 remains readable without new fields',()=>{
 const ref={kind:'datum',producerId:'reference-frame',role:'xy',occurrencePath:['definition-main'],sourceDocumentId:'source'},spatial={profile:'E4.M3-spatial/1',grounded:[],mates:[{id:'parallel',name:'Parallel',type:'parallel',a:ref,b:ref,flipped:true}]};assert.throws(()=>validateSpatial(spatial),/reversible direction/);spatial.profile='E4.M4-spatial/1';validateSpatial(spatial);delete spatial.mates[0].flipped;spatial.profile='E4.M3-spatial/1';validateSpatial(spatial);
});
