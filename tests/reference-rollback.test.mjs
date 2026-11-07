import test from 'node:test';
import assert from 'node:assert/strict';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';

test('finishing an earlier referenced sketch preserves valid bindings in later or suppressed sketches',async()=>{
 let doc=await extrusionDemo();const edit=(name,input)=>doc=command(doc,'cad.'+name+'.v1',input),create=sketchId=>edit('sketch.create',{sketchId,definitionId:'definition-main',name:sketchId,profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
 create('earlier');edit('sketch.entities.add',{sketchId:'earlier',unit:'mm',entities:[{id:'origin-copy',type:'point',point:[0,0],construction:false,converted:true,external:{kind:'datum',definitionId:'definition-main',producerId:'reference-frame',role:'origin',occurrencePath:['definition-main']}}]});
 create('later');edit('sketch.entity.add',{sketchId:'later',entity:{id:'later-line',type:'line',a:[5,5],b:[15,5],construction:false},unit:'mm'});edit('sketch.constraint.add',{sketchId:'later',constraint:{id:'later-length',type:'length',refs:[{entityId:'later-line',role:'entity'}],driving:true,value:10}});
 edit('parameter.set',{parameter:{id:'future-driver',name:'FutureDriver',expression:'10 mm',definitionId:null,unit:'mm',description:'Later dimension'}});edit('parameter.bind',{parameterId:'future-driver',target:{kind:'dimension',sketchId:'later',constraintId:'later-length'},enabled:true});
 const before=structuredClone(doc);assert.equal((await verifyCommand({before:doc,after:doc,rollbackBefore:'earlier',finishSketchId:'earlier'})).valid,true);assert.deepEqual(doc,before);
 const disabled=command(doc,'cad.feature.enable.v1',{featureId:'later',enabled:false});assert.equal((await verifyCommand({before:doc,after:disabled})).valid,true);assert.deepEqual(disabled.native.graph.parameters.find(p=>p.id==='future-driver').targets,before.native.graph.parameters.find(p=>p.id==='future-driver').targets);
 const forged=structuredClone(doc);forged.native.graph.parameters.find(p=>p.id==='future-driver').targets[0].constraintId='missing';await assert.rejects(()=>verifyCommand({before:doc,after:forged}),error=>error.code==='LostReference');assert.deepEqual(doc,before);
});
