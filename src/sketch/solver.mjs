import {createSketchSolver} from './solver-core.mjs';
import {validateEntity} from './profile.mjs';
import {make_gcs_wrapper,SolveStatus} from '@salusoft89/planegcs';
import {derivedId,pointAt,validReference} from './relations.mjs';
import {TOLERANCES,SOLVER} from '../lab/profile.mjs';
import {check} from '../errors.mjs';
const core=createSketchSolver({validateEntity,make_gcs_wrapper,SolveStatus,derivedId,pointAt,validReference,TOLERANCES,SOLVER,check});

export const mobility=core.mobility;
let shared=null,queue=Promise.resolve();
export function solveParametric(data,options={}){const task=queue.then(async()=>{shared??=make_gcs_wrapper();try{return await core.solveParametric(data,{...options,reuse:await shared});}catch(error){try{(await shared)?.destroy_gcs_module();}catch{}shared=null;throw error;}});queue=task.catch(()=>{});return task;}
