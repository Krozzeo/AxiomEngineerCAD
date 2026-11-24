import {solveNativeAssembly} from './native.mjs';
import {MATE_PROFILE,mateReferences} from './native-profile.mjs';
import {check} from '../errors.mjs';

// Explicit update policy: diagnose without retargeting any persisted reference.
export async function reconcileAssembly(value,{disableAffected=false,affectedPaths=null}={}){
  let candidate=structuredClone(value),spatial=candidate.native.graph.spatial;
  if(!spatial)return {document:candidate,issues:[]};
  spatial.profile=MATE_PROFILE;for(const m of spatial.mates)if(!affectedPaths||mateReferences(m).some(ref=>affectedPaths.some(path=>path.every((id,i)=>ref.occurrencePath[i]===id))))delete m.issue;
  let result=await solveNativeAssembly(candidate,{commit:true,diagnose:true});
  const issues=[...result.diagnostics.issues];
  for(const m of spatial.mates){const issue=issues.find(i=>i.id===m.id);if(issue)m.issue={kind:issue.kind,message:issue.message.slice(0,1024)};}
  if(issues.length)result=await solveNativeAssembly(candidate,{commit:true});
  if(!result.diagnostics.applicable){
    const conflicts=result.diagnostics.conflicts??[];
    for(const m of spatial.mates.filter(m=>!m.disabled&&!m.issue&&(!conflicts.length||conflicts.some(id=>id===m.id||String(id).startsWith(m.id+':'))))){const issue={id:m.id,kind:'Conflict',message:'The retained relation cannot be satisfied after the component change.'};issues.push(issue);m.issue={kind:issue.kind,message:issue.message};}
    result=await solveNativeAssembly(candidate,{commit:true});
  }
  check(result.diagnostics.applicable,'ConstraintConflict','The remaining valid relations cannot be solved; the previous assembly was preserved.');
  candidate=result.document;
  if(disableAffected)for(const m of candidate.native.graph.spatial.mates)if(issues.some(i=>i.id===m.id))m.disabled=true;
  return {document:candidate,issues};
}
