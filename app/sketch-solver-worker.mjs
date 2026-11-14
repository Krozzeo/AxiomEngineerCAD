import {dragComponent} from '/soft-drag.mjs';
import {MAX_SKETCH_ENTITIES} from '/curves.mjs';
import {make_gcs_wrapper,SolveStatus} from '/solver-vendor/index.js';
import {createSketchSolver} from '/solver-core.mjs';
import {validateEntity} from '/sketch-entities.mjs';
import {pointAt,validReference} from '/relation-kinds.mjs';
import {TOLERANCES,SOLVER} from '/solver-profile.mjs';
import {check} from '/errors.mjs';
// This worker returns temporary solved previews only. It has no session token or commit route.
let ids=new Map();const derivedId=(...parts)=>{const key=JSON.stringify(parts);if(!ids.has(key))ids.set(key,'preview_'+ids.size);return ids.get(key);};
const {solveParametric}=createSketchSolver({validateEntity,make_gcs_wrapper,SolveStatus,derivedId,pointAt,validReference,TOLERANCES,SOLVER,check});
const ready=make_gcs_wrapper('/solver-vendor/planegcs_dist/planegcs.wasm');let running=false,pending=null;
self.onmessage=event=>{const m=event.data;if(!Number.isSafeInteger(m?.id)||!m.data )return;if(m.data.entities.length>MAX_SKETCH_ENTITIES||m.data.constraints.length>1024){self.postMessage({id:m.id,error:'ResourceLimit',message:'Sketch preview exceeds the document capacity.'});return;}pending=m;process();};
async function process(){if(running||!pending)return;running=true;const request=pending;pending=null;const started=performance.now();try{const g=await ready;ids=new Map();const data=request.drag?dragComponent(request.data,request.drag.ref):request.data;
 const result=await solveParametric(data,{drag:request.drag,reuse:g});
 if(request.drag&&result.valid){const solved=new Map(result.entities.map(entity=>[entity.id,entity]));result.entities=request.data.entities.map(entity=>solved.get(entity.id)??entity);}
 self.postMessage({id:request.id,result,elapsedMs:performance.now()-started});}catch(e){self.postMessage({id:request.id,error:e.code??'SolverIndeterminate',message:e.message});}finally{running=false;process();}}
ready.then(()=>self.postMessage({ready:true})).catch(e=>self.postMessage({error:'UnsupportedCapability',message:e.message}));
