import {validate,check} from '../document.mjs';
import {contentOf,hash} from './schema.mjs';
import {geometryExperiment} from '../lab/kernel.mjs';
import {solveAssembly} from '../assembly/solver.mjs';
export async function verifyNative(value){validate(value);check(value.formatVersion===1,'incompatibleVersion','Convert this document to native v1 first.');const body=contentOf(value),seen=new Set();let geometry=null,assembly=null,operations=0;const budget=()=>check(++operations<=32,'ResourceLimit','Native verification exceeds 32 geometry/solver operations.');
  async function verify(c){const h=hash(c);if(seen.has(h))return;check(seen.size<32,'ResourceLimit','Native validation closure exceeds 32 contents.');seen.add(h);
    for(const f of c.graph.features)if(f.selector)check(['ResolvedStable','ResolvedReidentified'].includes(f.selector.state),f.selector.state,'Repair unresolved feature selector before versioning.');
    let g=null,a=null;const featureEvidence=[];if(c.experiment){budget();const result=await geometryExperiment(c.experiment.spec,{includeMesh:false});g={volumeMm3:result.volumeMm3,areaMm2:result.areaMm2,reference:result.reference.state};}
    if(c.assembly){budget();const result=solveAssembly(c.assembly);check(result.applicable,'InvalidGeometry','Assembly must have a feasible nonsingular placement.');a={status:result.status,dof:result.remainingDOF};}
    for(const f of c.graph.features){if(f.selector){const producer=c.graph.features.find(p=>p.id===f.selector.producerId);check(producer?.type==='geometry-probe'&&f.selector.kind!=='datum','UnsupportedCapability','This bounded native resolver supports proven geometry-probe face/edge roles.');budget();const r=await geometryExperiment({...producer.data.spec,selectorRole:f.selector.role,selectorKind:f.selector.kind},{includeMesh:false});check(['ResolvedStable','ResolvedReidentified'].includes(r.reference.state),r.reference.state,'Feature reference is no longer uniquely proven.');featureEvidence.push({id:f.id,reference:r.reference.state});}
      if(f.definitionId!==c.graph.primaryDefinitionId&&f.type==='geometry-probe'){budget();const r=await geometryExperiment(f.data.spec,{includeMesh:false});featureEvidence.push({id:f.id,volumeMm3:r.volumeMm3,areaMm2:r.areaMm2});}
      if(f.definitionId!==c.graph.primaryDefinitionId&&f.type==='spatial-probe'){budget();const r=solveAssembly(f.data);check(r.applicable,'InvalidGeometry','Nonprimary spatial feature is not feasible.');featureEvidence.push({id:f.id,status:r.status,dof:r.remainingDOF});}}
    if(c.verification){const old=c.verification,near=(x,y)=>Math.abs(x-y)<=Math.max(1e-6,Math.abs(x)*1e-8),oldFeatures=old.featureEvidence??[];const featuresMatch=oldFeatures.length===featureEvidence.length&&featureEvidence.every((f,i)=>Object.keys(f).every(k=>typeof f[k]==='number'?near(f[k],oldFeatures[i][k]):f[k]===oldFeatures[i][k]));check((!g&&!old.geometry||g&&old.geometry&&near(g.volumeMm3,old.geometry.volumeMm3)&&near(g.areaMm2,old.geometry.areaMm2)&&g.reference===old.geometry.reference)&&JSON.stringify(old.assembly)===JSON.stringify(a)&&featuresMatch,'incompatibleVersion','Historical geometry/solver evidence differs under this runtime. Source preserved.');}
    for(const d of c.graph.dependencies)await verify(d.snapshot);for(const v of c.localVersions)await verify(v.content);
    return {geometry:g,assembly:a,featureEvidence};
  }
  const result=await verify(body);({geometry,assembly}=result);return {valid:true,inputHash:hash(body),geometry,assembly,featureEvidence:result.featureEvidence,contentsChecked:seen.size};
}
