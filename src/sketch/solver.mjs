import {createHash} from 'node:crypto';
import {createSketchSolver} from './solver-core.mjs';
import {validateEntity} from './profile.mjs';
import {make_gcs_wrapper,SolveStatus} from '@salusoft89/planegcs';
import {derivedId,pointAt,validReference} from './relations.mjs';
import {TOLERANCES,SOLVER} from '../lab/profile.mjs';
import {check} from '../errors.mjs';
const core=createSketchSolver({validateEntity,make_gcs_wrapper,SolveStatus,derivedId,pointAt,validReference,TOLERANCES,SOLVER,check});

export const mobility=core.mobility;
let shared=null,queue=Promise.resolve();
const solvedCache=new Map();
export function solveParametric(data,options={}){
 const key=Object.keys(options).length?null:createHash('sha256').update(JSON.stringify(data)).digest('hex');
 if(key&&solvedCache.has(key))return Promise.resolve(structuredClone(solvedCache.get(key)));
 const task=queue.then(async()=>{
  shared??=make_gcs_wrapper();
  try{
   const result=await core.solveParametric(data,{...options,reuse:await shared});
   if(key){if(solvedCache.size>=64)solvedCache.delete(solvedCache.keys().next().value);solvedCache.set(key,structuredClone(result));}
   return result;
  }catch(error){try{(await shared)?.destroy_gcs_module();}catch{}shared=null;throw error;}
 });queue=task.catch(()=>{});return task;
}
